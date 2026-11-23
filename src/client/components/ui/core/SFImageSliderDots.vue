<template>
  <!--
    Roving-tabindex rail: only the active dot is in tab order, so the rail
    counts as a single Tab stop. Arrow Left/Right and Home/End move focus
    AND the active slide together; `event.stopPropagation()` keeps the same
    key from reaching a `@keydown` handler on an ancestor.
  -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- Delegated arrow-key handler for the focusable dot buttons inside. -->
  <div
    class="flex items-center justify-center gap-1"
    data-testid="image-slider-dots"
    @keydown="onKeydown"
  >
    <button
      v-for="index in count"
      :key="index"
      ref="dotRefs"
      type="button"
      class="hit-area-min size-1 rounded-full bg-dot-inactive transition-all duration-300"
      :class="{ 'w-3 bg-primary!': index - 1 === active }"
      :aria-label="$t('image_slider.a11ly.go_to_image', { index })"
      :aria-current="index - 1 === active ? 'true' : undefined"
      :aria-controls="controls"
      aria-keyshortcuts="ArrowLeft ArrowRight Home End"
      :tabindex="index - 1 === active ? 0 : -1"
      :data-testid="`image-slider-dot-${index - 1}`"
      @click="$emit('select', index - 1)"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import { wrapIndex } from '@client/utils/math'
import { useKeydownActions } from '@client/composables/useKeydownActions'

const { count, active } = defineProps<{
  /** Total number of slides (dots) to render. */
  count: number
  /** Zero-based index of the currently active slide. */
  active: number
  /** ID of the slides container each dot controls (for `aria-controls`). */
  controls?: string
}>()

const emit = defineEmits<{
  /** Emitted with the zero-based slide index when a dot is activated. */
  select: [index: number]
}>()

const dotRefs = useTemplateRef<HTMLButtonElement[]>('dotRefs')

const focusDot = (index: number) => {
  // `active` is updated by the parent on the next tick after the select
  // emit; focus the newly-active dot after that render so the roving
  // tabindex reflects the move.
  nextTick(() => dotRefs.value?.[index]?.focus())
}

// `stopPropagation` keeps the same arrow/Home/End key from reaching a
// `@keydown` handler on an ancestor.
const onKeydown = useKeydownActions(
  {
    right: () => {
      const next = wrapIndex(active + 1, count)
      emit('select', next)
      focusDot(next)
    },
    left: () => {
      const next = wrapIndex(active - 1, count)
      emit('select', next)
      focusDot(next)
    },
    home: () => {
      emit('select', 0)
      focusDot(0)
    },
    end: () => {
      emit('select', count - 1)
      focusDot(count - 1)
    },
  },
  { stopPropagation: true },
)
</script>
