<template>
  <!--
   Inertia's Link component is only intended for in-app navigation. It issues an
   XHR visit to the target, which (a) fails CORS on external domains and (b) does
   not reboot the app — so shop-scoped state (locale, oRPC shop header, shared
   props) would stay on the previous shop after a same-origin shop switch. We
   therefore render a plain <a> for any absolute URL (see isHardNavigation).

   A single-root <component :is> is used instead of v-if/v-else dual roots so
   that $el always resolves to the rendered anchor element. Fragment components
   expose a comment placeholder as $el, which breaks template refs, directives,
   and intersection observers attached to the root.

   https://github.com/inertiajs/inertia/issues/1719
   -->
  <component
    :is="linkComponent"
    :href="href"
    :target="target"
    :rel="computedRel"
    v-bind="mergedBindings"
    @click="onClick"
    @pointerdown="onPointerDown"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { computed, useAttrs } from 'vue'
import type { AnchorHTMLAttributes } from 'vue'
import {
  isAbsoluteLink,
  isExternalLink,
  localizeLink,
} from '@scayle/storefront/shared'
import type { InertiaLinkProps } from '@inertiajs/vue3'
import { useRoute } from '@client/composables/useRoute'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { GlobalEventCallback, RequestPayload } from '@inertiajs/core'

/**
 * Extends the InertiaLinkProps type with additional props.
 *
 * @see https://inertiajs.com/docs/v2/the-basics/links
 */
type Props = Omit<InertiaLinkProps, 'href' | 'as'> & {
  /**
   * The target location for the link. Accepts a string.
   */
  to: string
  /**
   * If true, disables the default styling and renders the link as raw HTML.
   */
  raw?: boolean
  /**
   * When true, applies the disabled Standard state and blocks navigation.
   */
  disabled?: boolean
  /**
   * Specifies where to open the linked document.
   */
  target?: '_self' | '_blank' | '_parent' | '_top'
  /**
   * The `rel` attribute for the link. When omitted and `target === '_blank'`,
   * defaults to `'noopener noreferrer'` to prevent tab-nabbing and referrer
   * leaks on links that open in a new browsing context.
   */
  rel?: string
  /**
   * When true, triggers prefetch on pointerdown for internal links opening in
   * the same browsing context (`target="_self"`). The request is in flight
   * before the tap completes, which cuts perceived navigation latency on touch
   * devices by the duration of the press.
   *
   * Tradeoff: a touch scroll starting on the link also fires one prefetch,
   * because `router.prefetch` cannot be aborted once sent and any hold delay
   * eats the head start this prop exists for. Enable it only where one wasted
   * GET per scroll gesture is acceptable. Inertia's prefetch cache dedupes
   * repeat presses on the same link for 30 seconds.
   */
  prefetchOnPress?: boolean
}

const {
  raw = false,
  disabled = false,
  target = '_self',
  to,
  rel,
  preserveState,
  only,
  prefetchOnPress = false,
} = defineProps<Props>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const { baseUrl } = useRoute()
const { config } = useStorefrontConfig()

/**
 * Figma Standard text link styles when `raw` is false. Inherits typography from
 * the parent. Uses `text-gray-500` for disabled until a semantic disabled token exists.
 */
const linkClasses = computed(() => {
  if (raw) {
    return ''
  }

  if (disabled) {
    return ['text-gray-500 underline pointer-events-none']
  }

  return [
    'text-primary underline transition duration-200 ease-linear',
    'hover:text-accent',
  ]
})

const isExternal = computed(() => isExternalLink(to, baseUrl.value))

/**
 * Computed property to localize the link based on the storefront context or return the external link if it starts with 'http'
 *
 * All link localization should be handled within this component via the computed property.
 * This simplifies the process of adding new links, since no server-side changes are required.
 * By using standard links throughout the app and routing them through this component, you ensure consistent localization everywhere without adding extra localization steps.
 */
const href = computed(() => {
  return isAbsoluteLink(to) || isExternal.value
    ? to
    : localizeLink(config.value, to)
})

/**
 * Whether the link should perform a full document navigation (native `<a>`)
 * instead of an Inertia client-side visit.
 *
 * Absolute URLs (`http(s)://…`) always navigate hard, even when same-origin:
 * a shop switch points at an absolute, same-domain URL (e.g. `https://shop/de`)
 * and must reboot the app so shop-scoped state (locale, oRPC shop header,
 * shared props) re-initializes. Cross-origin links navigate hard too, since
 * Inertia's `<Link>` issues an XHR that fails CORS on external domains.
 */
const isHardNavigation = computed(() => isAbsoluteLink(to) || isExternal.value)

/**
 * Resolves the effective `rel` value: explicit prop wins, otherwise
 * `'noopener noreferrer'` is set automatically when the link opens in a
 * new tab.
 */
const computedRel = computed(() => {
  if (rel !== undefined) {
    return rel
  }
  return target === '_blank' ? 'noopener noreferrer' : undefined
})

const toTabindex = (value: unknown): AnchorHTMLAttributes['tabindex'] => {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }
  return undefined
}

const toAriaDisabled = (
  value: unknown,
): AnchorHTMLAttributes['aria-disabled'] => {
  if (value === true || value === 'true') {
    return true
  }
  if (value === false || value === 'false') {
    return false
  }
  return undefined
}

const linkBindings = computed(() => {
  const {
    class: attrClass,
    tabindex: attrTabindex,
    'aria-disabled': attrAriaDisabled,
    ...restAttrs
  } = attrs

  return {
    ...restAttrs,
    class: attrClass ? [linkClasses.value, attrClass] : linkClasses.value,
    'aria-disabled': disabled ? true : toAriaDisabled(attrAriaDisabled),
    tabindex: disabled ? -1 : toTabindex(attrTabindex),
  }
})

const onClick = (event: MouseEvent) => {
  if (disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
}

const onPointerDown = () => {
  // Prefetch only for internal links opening in the same browsing context:
  // hard-navigation links should not attempt XHR, and Inertia never intercepts
  // clicks on other targets (e.g. `_blank`), so their prefetch is thrown away.
  if (
    prefetchOnPress &&
    !isHardNavigation.value &&
    !disabled &&
    target === '_self'
  ) {
    router.prefetch(href.value, { method: 'get' })
  }
}

const isNewLocation: GlobalEventCallback<'before', RequestPayload> = (
  event,
) => {
  return event.url.href !== window.location.href
}

/**
 * Returns the element or component to render as the link root.
 * Hard-navigation links (any absolute URL, see `isHardNavigation`) use a plain
 * `<a>` so Inertia does not issue an XHR visit and the app reboots onto the new
 * shop. Internal links use Inertia `Link` for client-side navigation.
 */
const linkComponent = computed(() => (isHardNavigation.value ? 'a' : Link))

/**
 * Merges fallthrough attributes, link classes, and Inertia-specific props
 * into a single binding object for the root element. Inertia props are
 * omitted for hard-navigation links to avoid unknown HTML attributes on `<a>`.
 */
const mergedBindings = computed(() => {
  if (isHardNavigation.value) {
    return linkBindings.value
  }
  return {
    ...linkBindings.value,
    preserveState,
    only,
    onBefore: isNewLocation,
  }
})
</script>
