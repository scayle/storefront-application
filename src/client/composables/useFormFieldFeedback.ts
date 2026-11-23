import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'

/**
 * The feedback channels a form field can surface below its control, in
 * descending precedence: an error wins over an info message, which wins over
 * plain helper text. Only one channel is ever displayed at a time.
 */
export type FormFieldFeedbackChannel = 'error' | 'info' | 'helper'

/**
 * Describes a single feedback channel: whether it currently has content to
 * show and the id of the element that renders it (used for `aria-describedby`).
 */
export interface FormFieldFeedbackSource {
  /** Whether the channel currently has text to display. */
  active: MaybeRefOrGetter<boolean>
  /**
   * Id of the element that renders this channel. Omit for channels that change
   * state without rendering their own text (e.g. a bare `hasErrors` flag).
   */
  id?: string
}

const CHANNEL_PRECEDENCE = ['error', 'info', 'helper'] as const

/**
 * Derives which feedback channel a form field should display and the matching
 * `aria-describedby` value from the field's current state.
 *
 * Shared by the form UI components (`SFCheckbox`, `SFTextInput`) so they all
 * resolve error/info/helper precedence and wire accessibility the same way
 * instead of each hand-rolling the logic. Pass only the channels a component
 * supports; missing channels are treated as never active.
 *
 * @param channels - The feedback channels keyed by name. Precedence is fixed:
 *   `error` > `info` > `helper`.
 * @param extraDescribedBy - Optional additional id(s) to always append to
 *   `aria-describedby`, such as an externally supplied `aria-describedby`.
 * @returns `visibleChannel`, the channel currently shown (or `undefined`), and
 *   `describedBy`, the space-joined `aria-describedby` value (or `undefined`).
 *
 * @example
 * ```ts
 * const { visibleChannel, describedBy } = useFormFieldFeedback({
 *   error: { active: () => Boolean(errorText), id: errorId },
 *   helper: { active: () => Boolean(helperText), id: helperId },
 * })
 * ```
 */
export function useFormFieldFeedback(
  channels: Partial<Record<FormFieldFeedbackChannel, FormFieldFeedbackSource>>,
  extraDescribedBy?: MaybeRefOrGetter<string | undefined>,
): {
  visibleChannel: ComputedRef<FormFieldFeedbackChannel | undefined>
  describedBy: ComputedRef<string | undefined>
} {
  const visibleChannel = computed(() =>
    CHANNEL_PRECEDENCE.find((channel) => {
      const source = channels[channel]
      return source && toValue(source.active)
    }),
  )

  const describedBy = computed(() => {
    const visibleId = visibleChannel.value
      ? channels[visibleChannel.value]?.id
      : undefined
    const ids = [visibleId, toValue(extraDescribedBy)].filter(Boolean)
    return ids.length > 0 ? ids.join(' ') : undefined
  })

  return { visibleChannel, describedBy }
}
