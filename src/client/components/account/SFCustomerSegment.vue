<template>
  <template v-for="name in resolveSlotNames()" :key="name">
    <slot :name="name" />
  </template>
</template>

<script setup lang="ts">
import { useCustomer } from '@client/composables/useCustomer'

const { renderAllMatching = false } = defineProps<{
  /**
   * Renders every named slot whose segment the customer belongs to, in the order they
   * are declared, instead of only the first one. A slot with `v-if`, `v-else-if`,
   * `v-else`, or `v-for` comes after the slots without one.
   */
  renderAllMatching?: boolean
}>()

const slots = defineSlots<{
  /**
   * Renders for a user who is not logged in, for a customer in none of the named
   * segments, and while the `customer` prop resolves.
   */
  default: () => unknown
  /** Renders when the customer belongs to the segment whose reference key is the slot name. */
  [referenceKey: string]: (() => unknown) | undefined
}>()

const { isInSegment } = useCustomer()

// The key order of `slots` decides both the first match and the order of all
// matches. Vue's template compiler keeps the declared order, but passes slots
// with `v-if`, `v-else-if`, `v-else`, or `v-for` through `createSlots`, which
// appends them after the rest.
const resolveSlotNames = () => {
  const matchingSlotNames = Object.keys(slots).filter(
    (name) => name !== 'default' && isInSegment(name) === true,
  )
  if (matchingSlotNames.length === 0) {
    return ['default']
  }
  return renderAllMatching ? matchingSlotNames : matchingSlotNames.slice(0, 1)
}
</script>
