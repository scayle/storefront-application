import { tryOnMounted } from '@vueuse/core'
import { toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { CountdownState } from '@client/composables/useCountdownTimer'

/**
 * Emits a `finished` event exactly once when a countdown reaches the
 * `finished` state.
 *
 * Shared by the countdown display components (`SFCountdown`,
 * `SFCountdownLarge`), which both notify their parent when the timer expires.
 * The check runs on mount (the timer is inert during SSR, so the real state is
 * only known client-side) and on every later state change. Kept separate from
 * `useCountdownTimer` so the timer stays a pure, emit-agnostic state machine.
 *
 * @param emit - The component's `finished` emitter.
 * @param state - Reactive countdown state from `useCountdownTimer`.
 *
 * @example
 * ```ts
 * const emit = defineEmits<{ finished: [] }>()
 * const { state } = useCountdownTimer(() => timeUntil)
 * useCountdownFinished(emit, state)
 * ```
 */
export function useCountdownFinished(
  emit: (event: 'finished') => void,
  state: MaybeRefOrGetter<CountdownState>,
): void {
  let hasEmittedFinished = false

  const emitFinishedOnce = () => {
    if (hasEmittedFinished) {
      return
    }
    hasEmittedFinished = true
    emit('finished')
  }

  tryOnMounted(() => {
    if (toValue(state) === 'finished') {
      emitFinishedOnce()
    }
  })

  watch(
    () => toValue(state),
    (current) => {
      if (current === 'finished') {
        emitFinishedOnce()
      }
    },
  )
}
