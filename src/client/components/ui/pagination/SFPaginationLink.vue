<template>
  <!--
    Active page: not a link to itself, just a span with
    `aria-current="page"`, the canonical APG value. No `aria-label`: a span
    without a role cannot carry one, and the visible page number names it.
  -->
  <span
    v-if="page.isActive && !disabled"
    v-bind="attrs"
    :data-testid="testId ?? `paginationLink-${page.number}`"
    aria-current="page"
    class="sf-pagination-item border-accent! font-bold text-accent!"
  >
    <slot>
      {{ page.number }}
    </slot>
  </span>

  <!--
    Boundary disabled state: non-interactive span so keyboard and pointer
    cannot trigger Inertia navigation (a disabled `<Link>` still activates
    on Enter). `role="link"` lets it carry the label of the icon it shows
    and be announced as an unavailable link.
  -->
  <span
    v-else-if="disabled"
    v-bind="attrs"
    :data-testid="testId ?? `paginationLink-${page.number}`"
    role="link"
    aria-disabled="true"
    tabindex="-1"
    :aria-label="ariaLabel"
    class="sf-pagination-item cursor-default border-transparent text-secondary opacity-40"
  >
    <slot>
      {{ page.number }}
    </slot>
  </span>

  <!-- eslint-disable-next-line vuejs-accessibility/aria-unsupported-elements -- `Link` is Inertia's component, which renders an `<a>`. The rule reads the name as the HTML `<link>` element. -->
  <Link
    v-else
    v-bind="attrs"
    :data-testid="testId ?? `paginationLink-${page.number}`"
    :href="page.to"
    raw
    :aria-label="ariaLabel"
    :class="[
      'sf-pagination-item border-transparent text-secondary',
      'hover:border-gray-100 hover:text-primary',
    ]"
    preserve-state
    :only="PRODUCT_LISTING_RELOAD_PROPS"
    :on-success="scrollToTop"
    @click="onClick"
  >
    <slot>
      {{ page.number }}
    </slot>
  </Link>
</template>

<script setup lang="ts">
import type { Page } from '@client/types'
import { Link } from '@inertiajs/vue3'
import { useAttrs } from 'vue'
import { PRODUCT_LISTING_RELOAD_PROPS } from '@shared/constants/productListing'

/**
 * `page.isActive`/`disabled` pick between three different root node types
 * (span, span, `Link`). Vue's SSR compiler does not reliably fall through
 * `class`/listeners from the parent onto a conditional root that mixes plain
 * elements with a component branch, which produced an SSR/CSR class
 * mismatch on hydration. Disabling automatic inheritance and forwarding
 * `$attrs` explicitly on every branch keeps the merge identical on server
 * and client.
 */
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()

const { disabled = false } = defineProps<{
  /** When true, the link is non-interactive (boundary state — prev/next at first/last page). */
  disabled?: boolean
  /** Page object containing number, to (route), and isActive state. */
  page: Page
  /** Accessible label for the link (e.g. "Go to page 5", "Go to the previous page"). */
  ariaLabel?: string
  /** Overrides the auto-generated `data-testid` attribute. */
  testId?: string
}>()

const scrollToTop = () => {
  window.scroll({ behavior: 'smooth', top: 0 })
}

const onClick = (event: MouseEvent) => {
  if (disabled) {
    event.preventDefault()
    event.stopPropagation()
  }
}
</script>
