import type { MaybeRefOrGetter } from 'vue'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { CountdownState } from '@client/composables/useCountdownTimer'
import { useCountdownFinished } from './useCountdownFinished'

function mountCountdown(state: MaybeRefOrGetter<CountdownState>) {
  const emit = vi.fn()

  const wrapper = mount(
    defineComponent({
      setup() {
        useCountdownFinished(emit, state)
        return () => null
      },
    }),
  )

  return { wrapper, emit }
}

describe('useCountdownFinished', () => {
  it.for([
    ['the countdown has already expired', 'finished', true],
    ['the countdown is still running', 'standard', false],
    ['the countdown is in the urgent state', 'urgent', false],
  ] as const)(
    'emits finished on mount only when %s',
    ([, state, shouldEmit]) => {
      const { emit } = mountCountdown(ref<CountdownState>(state))

      expect(emit.mock.calls).toEqual(shouldEmit ? [['finished']] : [])
    },
  )

  it('emits finished when the state reaches finished after mount', async () => {
    const state = ref<CountdownState>('standard')
    const { emit } = mountCountdown(state)

    state.value = 'urgent'
    await nextTick()
    expect(emit).not.toHaveBeenCalled()

    state.value = 'finished'
    await nextTick()

    expect(emit).toHaveBeenCalledExactlyOnceWith('finished')
  })

  // The emit guard is spent by the first `finished` emit, whether that
  // happened on mount or after a transition; a new target date can restart
  // the timer but never re-arms the emit.
  it.for([
    ['it emitted on mount', 'finished'],
    ['it emitted after a transition to finished', 'standard'],
  ] as const)('does not emit a second time when %s', async ([, initial]) => {
    const state = ref<CountdownState>(initial)
    const { emit } = mountCountdown(state)

    if (initial === 'standard') {
      state.value = 'finished'
      await nextTick()
    }
    expect(emit).toHaveBeenCalledTimes(1)

    state.value = 'standard'
    await nextTick()
    state.value = 'finished'
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
  })

  it('reads the state through a getter', async () => {
    const state = ref<CountdownState>('standard')
    const { emit } = mountCountdown(() => state.value)

    state.value = 'finished'
    await nextTick()

    expect(emit).toHaveBeenCalledExactlyOnceWith('finished')
  })

  it('keeps the emit guard per composable instance', async () => {
    const state = ref<CountdownState>('standard')
    const first = mountCountdown(state)
    const second = mountCountdown(state)

    state.value = 'finished'
    await nextTick()

    expect(first.emit).toHaveBeenCalledTimes(1)
    expect(second.emit).toHaveBeenCalledTimes(1)
  })

  it('stops watching the state once the component unmounts', async () => {
    const state = ref<CountdownState>('standard')
    const { wrapper, emit } = mountCountdown(state)

    wrapper.unmount()
    state.value = 'finished'
    await nextTick()

    expect(emit).not.toHaveBeenCalled()
  })
})
