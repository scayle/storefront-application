import { describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'
import { useFormFieldFeedback } from './useFormFieldFeedback'

/**
 * Runs the composable inside an effect scope so its computeds work without a
 * mounted component, and returns the result plus a disposer.
 */
function setup(...args: Parameters<typeof useFormFieldFeedback>) {
  const scope = effectScope()
  const result = scope.run(() => useFormFieldFeedback(...args))!
  return { ...result, stop: () => scope.stop() }
}

describe('useFormFieldFeedback', () => {
  it('shows nothing when no channel is active', () => {
    const { visibleChannel, describedBy } = setup({
      error: { active: false, id: 'error' },
      helper: { active: false, id: 'helper' },
    })

    expect(visibleChannel.value).toBeUndefined()
    expect(describedBy.value).toBeUndefined()
  })

  it('prefers error over info over helper', () => {
    const { visibleChannel, describedBy } = setup({
      error: { active: true, id: 'error' },
      info: { active: true, id: 'info' },
      helper: { active: true, id: 'helper' },
    })

    expect(visibleChannel.value).toBe('error')
    expect(describedBy.value).toBe('error')
  })

  it('falls back to info then helper as higher channels clear', () => {
    const hasError = ref(true)
    const hasInfo = ref(true)
    const { visibleChannel } = setup({
      error: { active: () => hasError.value, id: 'error' },
      info: { active: () => hasInfo.value, id: 'info' },
      helper: { active: true, id: 'helper' },
    })

    expect(visibleChannel.value).toBe('error')
    hasError.value = false
    expect(visibleChannel.value).toBe('info')
    hasInfo.value = false
    expect(visibleChannel.value).toBe('helper')
  })

  it('omits the id for a visible channel that renders no text', () => {
    const { visibleChannel, describedBy } = setup({
      error: { active: true },
      helper: { active: true, id: 'helper' },
    })

    expect(visibleChannel.value).toBe('error')
    expect(describedBy.value).toBeUndefined()
  })

  it('treats channels not passed in as never active', () => {
    const { visibleChannel } = setup({
      error: { active: false, id: 'error' },
      helper: { active: true, id: 'helper' },
    })

    // `info` is omitted entirely, so it must never win over the active helper.
    expect(visibleChannel.value).toBe('helper')
  })

  it('appends extra describedBy ids and joins them with a space', () => {
    const { describedBy } = setup(
      { helper: { active: true, id: 'helper' } },
      'external',
    )

    expect(describedBy.value).toBe('helper external')
  })

  it('returns only the extra describedBy id when no channel is visible', () => {
    const { describedBy } = setup(
      { helper: { active: false, id: 'helper' } },
      'external',
    )

    expect(describedBy.value).toBe('external')
  })
})
