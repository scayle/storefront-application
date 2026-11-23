import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useReturnFocus } from './useReturnFocus'

const focusable = () => ({ focus: vi.fn() })

describe('useReturnFocus', () => {
  it('captures a raw element and focuses it', async () => {
    const { setTrigger, returnFocus, triggerEl } = useReturnFocus()
    const el = focusable()

    setTrigger(el as never)
    expect(triggerEl.value).toBe(el)

    await returnFocus()
    expect(el.focus).toHaveBeenCalledOnce()
  })

  it('resolves a component instance to its root `$el`', () => {
    const { setTrigger, triggerEl } = useReturnFocus()
    const el = focusable()

    setTrigger({ $el: el } as never)

    expect(triggerEl.value).toBe(el)
  })

  it('ignores non-focusable roots (e.g. a fragment comment node) and null', () => {
    const { setTrigger, triggerEl } = useReturnFocus()

    setTrigger({ $el: {} } as never)
    expect(triggerEl.value).toBeNull()

    setTrigger(null)
    expect(triggerEl.value).toBeNull()
  })

  it('focuses synchronously by default', () => {
    const { setTrigger, returnFocus } = useReturnFocus()
    const el = focusable()
    setTrigger(el as never)

    returnFocus()

    // No await: focus already happened in the same tick.
    expect(el.focus).toHaveBeenCalledOnce()
  })

  it('defers focus to the next tick when asked', async () => {
    const { setTrigger, returnFocus } = useReturnFocus()
    const el = focusable()
    setTrigger(el as never)

    returnFocus({ defer: true })
    expect(el.focus).not.toHaveBeenCalled()

    await nextTick()
    expect(el.focus).toHaveBeenCalledOnce()
  })
})
