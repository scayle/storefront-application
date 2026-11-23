<template>
  <component
    :is="componentName"
    v-bind="rootBindings"
    :aria-label="ariaLabel ?? (hasLabel ? undefined : $t('global.back'))"
    class="flex h-10 shrink-0 cursor-pointer items-center text-primary focus-visible:focus-style"
    :class="
      hasLabel
        ? 'gap-2 rounded-md px-1 hover:bg-gray-200'
        : 'w-10 justify-center rounded-full'
    "
  >
    <IconNavigationLeft class="size-4 shrink-0" />
    <span v-if="hasLabel" class="min-w-0 truncate font-semibold">
      <slot>{{ label }}</slot>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useMounted } from '@vueuse/core'
import SFLink from '@client/components/ui/links/SFLink.vue'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import { routes } from '@shared/routes'

/**
 * Unified back control used across the storefront (PLP, PDP, order detail and
 * the checkout header). Renders a borderless back icon, either icon-only on a
 * transparent 40×40 tap target or with a trailing label. The labeled variant
 * shows a gray background on hover, matching the header navigation links.
 *
 * The label ends in an ellipsis only when a parent limits the width of the
 * button, for example with a `max-w-*` class. The root is `shrink-0`, so it
 * does not shrink in a flex row on its own.
 *
 * Link mode (`to`) navigates to a fixed destination. History-back mode
 * (`useHistoryBack`) navigates through browser history and falls back to
 * `fallbackLink` when no history is available.
 */
const {
  to,
  fallbackLink = routes.home,
  useHistoryBack = false,
  label,
  ariaLabel,
} = defineProps<{
  /**
   * Destination for link mode. Used when `useHistoryBack` is `false`.
   * Localized by `SFLink`.
   */
  to?: string
  /**
   * Destination used in history-back mode when no browser history is
   * available (e.g. the page was opened directly). Defaults to the home route.
   */
  fallbackLink?: string
  /**
   * When `true`, navigates back through browser history on click and falls
   * back to `fallbackLink` when no history exists. When `false`, renders a
   * plain link to `to`.
   */
  useHistoryBack?: boolean
  /**
   * Optional trailing label rendered next to the icon. When omitted (and no
   * default slot is provided) the button is icon-only with a 40×40 tap target.
   */
  label?: string
  /**
   * Accessible label for the control. For the icon-only variant it defaults to
   * the translated `global.back`. When a visible label/slot is present, the
   * visible text is used as the accessible name (WCAG 2.5.3 Label in Name), so
   * this is only needed to override that text.
   */
  ariaLabel?: string
}>()

const slots = useSlots()
const hasLabel = computed(() => Boolean(label) || Boolean(slots.default))

const mounted = useMounted()
const hasHistory = computed(() => mounted.value && window.history.length > 1)

// History-back mode renders a real <button> only once we know history exists
// (client-only). Otherwise we render an SFLink so the control degrades to a
// normal, crawlable navigation on SSR and when history is empty.
const useButton = computed(() => useHistoryBack && hasHistory.value)
const componentName = computed(() => (useButton.value ? 'button' : SFLink))

const goBack = () => window.history.back()

const rootBindings = computed(() => {
  if (useButton.value) {
    return { type: 'button', onClick: goBack }
  }
  return { to: useHistoryBack ? fallbackLink : to, raw: true }
})
</script>
