<template>
  <component
    :is="tag"
    :id="id"
    data-testid="label-value"
    :class="[LABEL_VALUE_SIZE_CLASS[size], LABEL_VALUE_COLOR_CLASS[size]]"
  >
    <span class="font-semibold">{{ label }}: </span>
    <!-- min-w-0 lets the value shrink when a caller makes this root a flex row. -->
    <span class="min-w-0 font-normal"
      ><slot>{{ value }}</slot></span
    >
  </component>
</template>

<script setup lang="ts">
import { TextSize, TextTag } from '@client/utils/constants'

const {
  size = TextSize.DEFAULT,
  tag = TextTag.P,
  id,
} = defineProps<{
  /**
   * Optional DOM id for associating the label with controls (`aria-labelledby`).
   */
  id?: string
  /**
   * Label that precedes the value. Rendered with `font-semibold`. Include any
   * trailing punctuation (e.g. `"Order ID:"`) so consumers control the
   * separator style.
   */
  label?: string
  /**
   * Value to display. If not provided, the default slot content is used.
   */
  value?: string
  /**
   * Typography size. `default` (`text-md`, `text-secondary`) for compact
   * metadata, `large` (`text-lg`, `text-primary`) for emphasized fields,
   * and for the PDP colour label.
   */
  size?: TextSize
  /**
   * Semantic HTML element. Defaults to `<p>`. Use `span` for inline contexts.
   */
  tag?: TextTag
}>()

defineSlots<{
  /** Value text when the `value` prop is omitted. */
  default: () => unknown
}>()

const LABEL_VALUE_SIZE_CLASS = {
  [TextSize.DEFAULT]: 'text-md',
  [TextSize.LARGE]: 'text-lg',
} as Record<TextSize, string>

const LABEL_VALUE_COLOR_CLASS = {
  [TextSize.DEFAULT]: 'text-secondary',
  [TextSize.LARGE]: 'text-primary',
} as Record<TextSize, string>
</script>
