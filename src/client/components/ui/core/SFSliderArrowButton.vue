<template>
  <button
    type="button"
    class="sf-icon-button-shadow size-9"
    :aria-label="accessibleLabel"
    :aria-controls="controls"
    :aria-disabled="disabled"
    @click="$emit('click')"
  >
    <IconNavigationLeft
      v-if="direction === 'previous'"
      class="size-3 fill-gray-500"
    />
    <IconNavigationRight v-else class="size-3 fill-gray-500" />
  </button>
</template>

<script setup lang="ts">
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import IconNavigationRight from '@assets/icons/navigation/right.svg'

defineProps<{
  /** Navigation direction; selects the chevron icon and the accessible label. */
  direction: 'previous' | 'next'
  /**
   * Disables the button via `aria-disabled` (it stays focusable; the slider
   * ignores the click at a scroll boundary).
   */
  disabled?: boolean
  /**
   * Id of the element this button controls, rendered as `aria-controls`. Set it
   * only for true carousel chrome (`SFImageGallery`); leave unset for a plain
   * scroll list whose arrows make no carousel claim (`SFImageStrip`).
   */
  controls?: string
  /**
   * Accessible name for the button. Shared across image and product sliders,
   * so it has no default wording — every caller must supply a label
   * appropriate to its own context.
   */
  accessibleLabel: string
}>()

defineEmits<{
  /** Emitted on click; the parent decides what the direction navigates to. */
  click: []
}>()
</script>
