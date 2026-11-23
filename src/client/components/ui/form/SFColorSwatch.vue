<template>
  <div class="relative flex w-13 flex-col items-center gap-2">
    <div
      class="group relative"
      :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
    >
      <input
        :id="id"
        :checked="isChecked"
        :disabled="disabled"
        :aria-label="ariaLabel"
        :aria-invalid="invalid || undefined"
        class="absolute z-10 size-full cursor-pointer appearance-none rounded-lg disabled:cursor-not-allowed"
        type="checkbox"
        :data-testid="testId"
        :data-color-id="dataColorId"
        @change="$emit('change')"
      />
      <div class="relative flex size-9 items-center justify-center">
        <span
          v-if="Array.isArray(color)"
          class="absolute grid size-full grid-cols-2 overflow-hidden rounded-lg lg:group-hover:border lg:group-hover:border-primary lg:group-hover:outline-2 lg:group-hover:outline-offset-[-3px] lg:group-hover:outline-white"
          :class="lowContrastSurfaceClass"
        >
          <span
            v-for="(hex, index) in color"
            :key="`${index}-${hex}`"
            :style="{ backgroundColor: hex }"
            :class="{
              'last-of-type:col-span-full': color.length % 2 !== 0,
              'border border-gray-500': contrast === 'low',
            }"
            class="size-full"
          />
        </span>
        <span
          v-else
          :style="{ backgroundColor: color }"
          class="absolute size-full rounded-lg lg:group-hover:border lg:group-hover:border-primary lg:group-hover:outline-2 lg:group-hover:outline-offset-[-3px] lg:group-hover:outline-white"
          :class="lowContrastSurfaceClass"
        />
        <IconCheckmarkDefault
          class="z-0 size-3 fill-white opacity-0 lg:group-hover:opacity-100"
          :class="{
            'fill-primary!': contrast === 'low',
            'opacity-100': isChecked,
          }"
          aria-hidden="true"
        />
      </div>
    </div>
    <label
      v-if="$slots.default || label"
      :for="id"
      :class="
        !$slots.default && [
          'max-w-full truncate text-center text-sm font-semibold text-secondary',
          { 'text-disabled': disabled },
        ]
      "
    >
      <slot>{{ label }}</slot>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconCheckmarkDefault from '@assets/icons/checkmark/default.svg'

const {
  id,
  color,
  contrast = 'high',
  disabled = false,
  invalid = false,
  ariaLabel,
  label,
  isChecked = false,
  testId = 'color-swatch',
  dataColorId,
} = defineProps<{
  /** Unique identifier for the swatch input. */
  id: string
  /** Swatch fill color as a single hex or a multi-color grid. */
  color: string | string[]
  /**
   * Visual contrast variant. High contrast omits a resting border on dark swatches.
   * Low contrast adds a `border-gray-500` resting border for light swatches.
   */
  contrast?: 'high' | 'low'
  /** When true, the swatch cannot be toggled. */
  disabled?: boolean
  /** When true, sets `aria-invalid` on the input. */
  invalid?: boolean
  /** Accessible name when no visible `label` is provided. */
  ariaLabel?: string
  /** Text shown below the swatch. Can be replaced with the default slot. */
  label?: string
  /** Whether this swatch is currently selected. Controlled by the parent. */
  isChecked?: boolean
  /** Value for `data-testid` on the native input. Defaults to `color-swatch`. */
  testId?: string
  /** Optional `data-color-id` on the input for filter tracking and e2e tests. */
  dataColorId?: string | number
}>()

defineEmits<{
  /** Emitted when the user toggles the swatch. */
  change: []
}>()

const lowContrastSurfaceClass = computed(() =>
  contrast === 'low' ? 'border border-gray-500' : '',
)
</script>
