<template>
  <!--
    Native `<button>` because SFButton sets `disabled` + `tabindex="-1"`
    in the disabled state — boundary clicks would lose focus to `<body>`
    (WCAG 2.4.3). Boundary `disabled` wins over `isActive` since prev/next
    at the edge is a "disabled control", not a "current page".
  -->
  <button
    v-if="!page.isActive || disabled"
    type="button"
    :data-testid="testId ?? `paginationButton-${page.number}`"
    :aria-disabled="disabled || undefined"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :tabindex="disabled ? -1 : undefined"
    class="sf-pagination-item cursor-pointer border-transparent text-secondary hover:border-gray-100 hover:text-primary aria-disabled:cursor-default aria-disabled:opacity-40"
    @click="onClick"
  >
    <slot>
      {{ page.number }}
    </slot>
  </button>
  <!--
    Active page: rendered as a span, not a button to itself, with
    `aria-current="page"`, the canonical APG value. A span without a role
    cannot carry `aria-label`, so the visible page number names it.
  -->
  <span
    v-else
    :data-testid="testId ?? `paginationButton-${page.number}`"
    aria-current="page"
    class="sf-pagination-item border-accent! font-bold text-accent!"
  >
    <slot>
      {{ page.number }}
    </slot>
  </span>
</template>

<script setup lang="ts">
import type { Page } from '@client/types'

const { disabled = false, page } = defineProps<{
  /** When true, the button is aria-disabled and click is suppressed. */
  disabled?: boolean
  /** Page object containing number, to (route), and isActive state. */
  page: Page
  /** Accessible label for the button. */
  ariaLabel?: string
  /** Overrides the auto-generated `data-testid` attribute. */
  testId?: string
}>()

const emit = defineEmits<{
  /** Emitted when the page button is clicked. */
  select: [pageNumber: number]
}>()

const onClick = () => {
  if (disabled) {
    return
  }
  emit('select', page.number)
}
</script>
