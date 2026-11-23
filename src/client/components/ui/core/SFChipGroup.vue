<template>
  <component
    :is="rootTag"
    class="flex flex-wrap gap-2"
    :role="role"
    :aria-label="ariaLabel"
  >
    <legend v-if="rootTag === 'fieldset' && legend" class="sr-only">
      {{ legend }}
    </legend>
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Selection mode of the chip group. Drives ARIA semantics:
 * - `single` renders a `<fieldset role="radiogroup">` so screen
 *   readers announce the group and arrow-key navigation works
 *   across the contained `<input type="radio">` chips.
 * - `multi` renders a `<div>`, a `group` when `ariaLabel` names it;
 *   multi-select chips are native checkboxes that each announce
 *   themselves individually.
 * - `none` is for non-selectable rows (e.g. lists of dismissable
 *   filter chips) and renders a `<div>` like `multi`.
 */
type ChipGroupSelectionMode = 'single' | 'multi' | 'none'

const { selectionMode = 'multi', ariaLabel } = defineProps<{
  /**
   * Selection semantics of the group. See `ChipGroupSelectionMode`.
   */
  selectionMode?: ChipGroupSelectionMode
  /**
   * Accessible name for the group. Forwarded to `aria-label` on the
   * root element. Required when `selectionMode === 'single'` so
   * screen readers can announce the radiogroup. In `multi` and `none`
   * mode it also gives the root the `group` role, which an unnamed
   * `div` goes without.
   */
  ariaLabel?: string
  /**
   * Visible legend for `single` mode (rendered inside `<fieldset>`).
   * Hidden visually via `sr-only` but read by assistive tech.
   */
  legend?: string
}>()

const rootTag = computed(() =>
  selectionMode === 'single' ? 'fieldset' : 'div',
)

const role = computed(() => {
  if (selectionMode === 'single') {
    return 'radiogroup'
  }
  return ariaLabel ? 'group' : undefined
})
</script>
