<!-- eslint-disable vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Clicking the track is a pointer shortcut. The `slider` thumbs inside handle the keyboard. -->
<template>
  <div
    ref="containerRef"
    :role="hasGroupName ? 'group' : undefined"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    class="relative mt-12 mb-2 flex h-min w-full touch-none items-center select-none"
    :class="{ 'cursor-not-allowed! opacity-50': disabled }"
    @click="handleTrackClick"
  >
    <!-- Track background -->
    <div
      class="m-2 h-0.5 w-full cursor-pointer overflow-hidden rounded-full bg-gray-200"
      :class="{ 'cursor-not-allowed!': disabled }"
    >
      <!-- Active range -->
      <div
        class="absolute h-0.5 cursor-pointer rounded-full bg-primary transition-all duration-50"
        :class="{ 'cursor-not-allowed!': disabled }"
        :style="{
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
        }"
      />
    </div>

    <!-- Min -->
    <div
      class="absolute left-1/2 mb-8 -translate-x-1/2 transition-all duration-50"
      :style="{
        left: `${minPercent}%`,
        zIndex: activeThumb === 'min' ? 10 : 1,
      }"
    >
      <slot name="tooltip" :value="localMin">
        <div class="mb-8 rounded-sm bg-gray-300 p-1 text-sm text-secondary">
          {{ localMin }}
        </div>
      </slot>
    </div>
    <button
      ref="minThumbRef"
      type="button"
      class="hit-area-min absolute top-1/2 left-1/2 size-4 -translate-1/2 rounded-full border-2 border-primary bg-white transition-all duration-50"
      :class="[
        { 'cursor-not-allowed!': disabled },
        activeThumb !== null ? 'cursor-grabbing' : 'cursor-grab',
      ]"
      :style="{
        left: `${minPercent}%`,
        zIndex: activeThumb === 'min' ? 10 : 1,
      }"
      role="slider"
      aria-orientation="horizontal"
      :aria-valuemin="min"
      :aria-valuemax="localMax"
      :aria-valuenow="localMin"
      :aria-valuetext="formatValue ? formatValue(localMin) : undefined"
      :aria-label="minLabel ?? $t('range_slider.a11y.thumb_minimum')"
      :aria-disabled="disabled || undefined"
      v-on="pointerHandlers('min')"
      @keydown="handleKeydown($event, 'min')"
      @click.stop
    />

    <!-- Max -->
    <div
      class="absolute left-1/2 mb-8 -translate-x-1/2 transition-all duration-50"
      :style="{
        left: `${maxPercent}%`,
        zIndex: activeThumb === 'max' ? 10 : 1,
      }"
    >
      <slot name="tooltip" :value="localMax">
        <div class="mb-8 rounded-sm bg-gray-300 p-1 text-sm text-secondary">
          {{ localMax }}
        </div>
      </slot>
    </div>
    <button
      ref="maxThumbRef"
      type="button"
      class="hit-area-min absolute top-1/2 left-1/2 flex size-4 -translate-1/2 rounded-full border-2 border-primary bg-white transition-all duration-50"
      :class="[
        { 'cursor-not-allowed!': disabled },
        activeThumb !== null ? 'cursor-grabbing' : 'cursor-grab',
      ]"
      :style="{
        left: `${maxPercent}%`,
        zIndex: activeThumb === 'max' ? 10 : 1,
      }"
      role="slider"
      aria-orientation="horizontal"
      :aria-valuemin="localMin"
      :aria-valuemax="max"
      :aria-valuenow="localMax"
      :aria-valuetext="formatValue ? formatValue(localMax) : undefined"
      :aria-label="maxLabel ?? $t('range_slider.a11y.thumb_maximum')"
      :aria-disabled="disabled || undefined"
      v-on="pointerHandlers('max')"
      @keydown="handleKeydown($event, 'max')"
      @click.stop
    />
  </div>
</template>
<!-- eslint-enable vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->

<script setup lang="ts">
/**
 * Multi-thumb range slider (WAI-ARIA APG Slider, Multi-Thumb).
 *
 * Accessible-name contract:
 * - Group as a whole: pass `ariaLabel` or `ariaLabelledby`. The wrapper then
 *   renders as `role="group"`. Alternatively, wrap the slider in a labelled
 *   element (e.g. `<fieldset><legend>…</legend>`) and skip both props — the
 *   wrapping group name will apply.
 * - Individual thumbs: `minLabel` / `maxLabel`, defaulting to translated
 *   "Minimum value" / "Maximum value".
 */
import { computed, nextTick, ref, toRefs } from 'vue'
import { useElementBounding, useVModel } from '@vueuse/core'
import { useKeydownActions } from '@client/composables/useKeydownActions'

defineSlots<{
  /**
   * Slot for showing a tooltip above the slider knob
   * @param params Slot props
   * @param params.value - The value of the slider knob
   */
  tooltip: (params: { value: number }) => unknown
}>()

const props = withDefaults(
  defineProps<{
    /** Tuple of the current minimum and maximum values. */
    modelValue: [number, number]
    /** Minimum value for the slider. */
    min?: number
    /** Maximum value for the slider. */
    max?: number
    /**
     * Step size for arrow-key and drag updates. Pass integer units to avoid
     * IEEE-754 float noise in the model value and `aria-valuetext`.
     */
    step?: number
    /** PageUp/PageDown delta. Defaults to `max(step, (max - min) / 10)`. */
    largeStep?: number
    /** Whether the slider is disabled. */
    disabled?: boolean
    /**
     * Accessible name for the slider as a group. When set (or
     * `ariaLabelledby`), the wrapper becomes `role="group"`. Skip if the
     * slider is already wrapped in a labelled element (e.g. fieldset+legend).
     */
    ariaLabel?: string
    /** Like `ariaLabel`, but references an existing element's id. */
    ariaLabelledby?: string
    /** Accessible-name override for the minimum thumb. */
    minLabel?: string
    /** Accessible-name override for the maximum thumb. */
    maxLabel?: string
    /**
     * Formats the value for `aria-valuetext` so AT announces the same string
     * the consumer renders in the tooltip. Falls back to `aria-valuenow`.
     */
    formatValue?: (value: number) => string
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: [number, number]]
  dragend: [value: [number, number]]
  click: [value: [number, number]]
}>()

const { min, max, step, disabled } = toRefs(props)

const hasGroupName = computed(() => !!(props.ariaLabel || props.ariaLabelledby))
const containerRef = ref<HTMLElement | null>(null)
const minThumbRef = ref<HTMLButtonElement | null>(null)
const maxThumbRef = ref<HTMLButtonElement | null>(null)

// Created once in setup so its observers/listeners bind to the component's
// effect scope and tear down on unmount.
const {
  width: trackWidth,
  left: trackLeft,
  update: measureTrack,
} = useElementBounding(containerRef)

const model = useVModel(props, 'modelValue', emit)

const localMin = computed(() =>
  Math.max(min.value, Math.min(max.value, model.value[0])),
)
const localMax = computed(() =>
  Math.max(min.value, Math.min(max.value, model.value[1])),
)

const minPercent = computed(() => {
  const percent = ((localMin.value - min.value) / (max.value - min.value)) * 100
  return isNaN(percent) ? 0 : percent
})
const maxPercent = computed(() => {
  const percent = ((localMax.value - min.value) / (max.value - min.value)) * 100
  return isNaN(percent) ? 100 : percent
})

const activeThumb = ref<'min' | 'max' | null>(null)

const largeStep = computed(
  () => props.largeStep ?? Math.max(step.value, (max.value - min.value) / 10),
)

const updateValue = (thumb: 'min' | 'max', value: number) => {
  if (disabled.value) {
    return
  }

  let newValue = Math.round(value / step.value) * step.value
  newValue = Math.max(min.value, Math.min(max.value, newValue))

  if (thumb === 'min') {
    newValue = Math.min(newValue, localMax.value)
    model.value = [newValue, localMax.value]
  } else {
    newValue = Math.max(newValue, localMin.value)
    model.value = [localMin.value, newValue]
  }
}

const handleTrackClick = async (event: MouseEvent) => {
  if (disabled.value || !containerRef.value) {
    return
  }
  measureTrack()

  const clickX = event.clientX
  if (trackWidth.value === 0) {
    return
  }
  const percent = (clickX - trackLeft.value) / trackWidth.value
  const value = min.value + percent * (max.value - min.value)

  const distMin = Math.abs(value - localMin.value)
  const distMax = Math.abs(value - localMax.value)
  const thumb: 'min' | 'max' = distMin < distMax ? 'min' : 'max'

  updateValue(thumb, value)

  // Focus the moved thumb so arrow keys drive it without an extra Tab.
  await nextTick()
  const target = thumb === 'min' ? minThumbRef.value : maxThumbRef.value
  target?.focus()
  emit('click', model.value)
}

// Pointer capture binds subsequent pointermove/up/cancel to the thumb itself,
// so the drag follows the pointer even if it leaves the slider bounds.
const pointerHandlers = (thumb: 'min' | 'max') => {
  const endDrag = () => {
    if (activeThumb.value !== thumb) {
      return
    }
    activeThumb.value = null
    emit('dragend', model.value)
  }

  return {
    pointerdown: (event: PointerEvent) => {
      if (disabled.value) {
        return
      }
      event.stopPropagation()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      activeThumb.value = thumb
      measureTrack()
    },
    pointermove: (event: PointerEvent) => {
      if (activeThumb.value !== thumb) {
        return
      }
      if (trackWidth.value === 0) {
        return
      }
      const percent = (event.clientX - trackLeft.value) / trackWidth.value
      updateValue(thumb, min.value + percent * (max.value - min.value))
    },
    pointerup: endDrag,
    pointercancel: endDrag,
  }
}

const current = (thumb: 'min' | 'max') =>
  thumb === 'min' ? localMin.value : localMax.value

// One dispatcher per thumb; `step`/`largeStep` are read when the key fires.
// `PageUp`/`PageDown` normalize to `pageup`/`pagedown` via the default aliases.
// Unmapped keys fall through to the browser (Tab, etc.).
const makeThumbActions = (thumb: 'min' | 'max') => ({
  left: () => updateValue(thumb, current(thumb) - step.value),
  down: () => updateValue(thumb, current(thumb) - step.value),
  right: () => updateValue(thumb, current(thumb) + step.value),
  up: () => updateValue(thumb, current(thumb) + step.value),
  pagedown: () => updateValue(thumb, current(thumb) - largeStep.value),
  pageup: () => updateValue(thumb, current(thumb) + largeStep.value),
  home: () => updateValue(thumb, thumb === 'min' ? min.value : localMin.value),
  end: () => updateValue(thumb, thumb === 'max' ? max.value : localMax.value),
})

const thumbKeydown = {
  min: useKeydownActions(makeThumbActions('min')),
  max: useKeydownActions(makeThumbActions('max')),
}

const handleKeydown = (event: KeyboardEvent, thumb: 'min' | 'max') => {
  // A disabled slider ignores keys — and must not `preventDefault`, so Tab still moves focus.
  if (disabled.value) {
    return
  }
  thumbKeydown[thumb](event)
}
</script>
