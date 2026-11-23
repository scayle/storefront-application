import { useI18n } from 'vue-i18n'
import { useAnnouncer } from '@client/composables/useAnnouncer'

/**
 * Wiring a form supplies so the shared invalid-submit handling can inspect and
 * focus its fields without knowing anything about the validation library.
 */
export interface InvalidSubmitFeedbackOptions<TField extends string> {
  /**
   * The form's fields in visual order. The first-invalid lookup walks this
   * array, so the order decides which field receives focus.
   */
  fields: readonly TField[]
  /** Whether the field currently holds at least one validation error. */
  hasError: (field: TField) => boolean
  /** Moves keyboard focus to the field's control. */
  focus: (field: TField) => void
}

/**
 * Provides the shared screen-reader and focus handling for a submit that
 * client-side validation rejected.
 *
 * Used by the account profile forms so every form reports a failed submit the
 * same way, in a fixed order chosen to avoid announcement fatigue:
 *
 * 1. Focus moves to the first invalid field. Assistive technology reads that
 *    field's label plus the error text its `aria-describedby` points at, which
 *    is what identifies the error condition (WCAG 3.3.1).
 * 2. A polite count summary is announced. It queues behind the focus
 *    announcement rather than interrupting it, and adds the one thing focus
 *    cannot convey: how many other fields still need attention.
 *
 * `assertive` is deliberately not used here. The inline error regions rendered
 * by `SFValidatedInputGroup` are already live, so interrupting on top of them
 * would talk over the field the user was just sent to.
 *
 * @param options - The form's wiring.
 * @param options.fields - The form's fields in visual order; decides which
 *   field is treated as the first invalid one.
 * @param options.hasError - Reads whether a field currently holds an error.
 * @param options.focus - Moves keyboard focus to a field's control.
 * @returns `reportInvalidSubmit`, to call in a submit handler when
 *   `$validate()` resolves with `valid: false`.
 *
 * @example
 * ```ts
 * const { reportInvalidSubmit } = useInvalidSubmitFeedback({
 *   fields: editableFields,
 *   hasError: (field) => Boolean(r$.$fields[field].$errors?.length),
 *   focus: (field) => fieldRefs[field].value?.focus(),
 * })
 *
 * const { valid } = await r$.$validate()
 * if (!valid) {
 *   reportInvalidSubmit()
 *   return
 * }
 * ```
 */
export function useInvalidSubmitFeedback<TField extends string>({
  fields,
  hasError,
  focus,
}: InvalidSubmitFeedbackOptions<TField>): {
  reportInvalidSubmit: () => void
} {
  const { t } = useI18n()
  const { announce } = useAnnouncer()

  const reportInvalidSubmit = () => {
    const invalidFields = fields.filter(hasError)
    const [firstInvalidField] = invalidFields

    if (firstInvalidField) {
      focus(firstInvalidField)
    }

    // A rejected submit always means at least one field needs attention, but a
    // form whose schema carries form-level rules can fail with no per-field
    // error to count. Floor the count so such a form still announces something
    // sensible instead of "0 fields need your attention".
    // The key is spelled inline (not via a constant) so
    // `@intlify/vue-i18n/no-unused-keys` can see it. It lives under
    // `account.validation` because the profile forms are its only consumers
    // today; the wording itself is form-agnostic.
    announce(
      t(
        'account.validation.form_error_summary',
        Math.max(1, invalidFields.length),
      ),
    )
  }

  return { reportInvalidSubmit }
}
