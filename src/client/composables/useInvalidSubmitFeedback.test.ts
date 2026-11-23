import { describe, expect, it, vi } from 'vitest'
import { useInvalidSubmitFeedback } from './useInvalidSubmitFeedback'

const announceMock = vi.fn()
// Mirrors vue-i18n's positional plural call so assertions can read the count
// the composable computed, not just the key.
const tMock = vi.fn((key: string, count?: number) =>
  count === undefined ? key : `${key}:${count}`,
)

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock }),
}))

vi.mock('@client/composables/useAnnouncer', () => ({
  useAnnouncer: () => ({ announce: announceMock }),
}))

const fields = ['firstName', 'lastName', 'birthDate'] as const
type Field = (typeof fields)[number]

/**
 * Builds the composable over a fixed set of invalid fields, returning the focus
 * spy alongside `reportInvalidSubmit` so tests can assert both channels.
 */
function setup(invalidFields: Field[]) {
  const focus = vi.fn()
  const { reportInvalidSubmit } = useInvalidSubmitFeedback<Field>({
    fields,
    hasError: (field) => invalidFields.includes(field),
    focus,
  })
  return { reportInvalidSubmit, focus }
}

describe('useInvalidSubmitFeedback', () => {
  it.for([
    {
      invalid: ['firstName', 'birthDate'],
      summary: 'account.validation.form_error_summary:2',
    },
    {
      invalid: ['lastName'],
      summary: 'account.validation.form_error_summary:1',
    },
    { invalid: [], summary: 'account.validation.form_error_summary:1' },
  ] as const)(
    'announces $summary for $invalid.length invalid fields',
    ({ invalid, summary }) => {
      const { reportInvalidSubmit } = setup([...invalid])

      reportInvalidSubmit()

      expect(announceMock).toHaveBeenCalledWith(summary)
    },
  )

  it('does not move focus when no field carries an error', () => {
    const { reportInvalidSubmit, focus } = setup([])

    reportInvalidSubmit()

    expect(focus).not.toHaveBeenCalled()
  })

  it('focuses the first invalid field in field order, not call order', () => {
    const { reportInvalidSubmit, focus } = setup(['birthDate', 'lastName'])

    reportInvalidSubmit()

    expect(focus).toHaveBeenCalledExactlyOnceWith('lastName')
  })

  it('announces politely so the summary queues behind the focus announcement', () => {
    const { reportInvalidSubmit } = setup(['firstName'])

    reportInvalidSubmit()

    // `announce` defaults to polite; passing no options is the assertion.
    expect(announceMock).toHaveBeenCalledExactlyOnceWith(
      'account.validation.form_error_summary:1',
    )
  })

  it('moves focus before announcing so the field is read first', () => {
    const calls: string[] = []
    const focus = vi.fn(() => {
      calls.push('focus')
    })
    announceMock.mockImplementation(() => {
      calls.push('announce')
    })

    const { reportInvalidSubmit } = useInvalidSubmitFeedback<Field>({
      fields,
      hasError: (field) => field === 'firstName',
      focus,
    })
    reportInvalidSubmit()

    expect(calls).toEqual(['focus', 'announce'])
  })
})
