import { tryOnMounted, tryOnScopeDispose } from '@vueuse/core'
import { computed, shallowRef, toValue } from 'vue'
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from '@client/utils/time'

/**
 * Countdown display state based on remaining time.
 *
 * - `standard`: more than 24 hours remaining
 * - `urgent`: 24 hours or fewer remaining
 * - `finished`: target time has passed
 */
export type CountdownState = 'standard' | 'urgent' | 'finished'

/**
 * Reactive countdown state with broken-down time components.
 *
 * All values are computed refs that reactively update as the countdown timer ticks.
 * Use `state` to drive CSS classes; use time components for display.
 */
export interface CountdownTimerReturn {
  /** Current countdown display state. */
  state: ComputedRef<CountdownState>
  /** Full days remaining. */
  days: ComputedRef<number>
  /** Hours remaining within the current day. */
  hours: ComputedRef<number>
  /** Minutes remaining within the current hour. */
  minutes: ComputedRef<number>
  /** Seconds remaining within the current minute. */
  seconds: ComputedRef<number>
  /** Total milliseconds remaining. */
  remaining: ComputedRef<number>
}

/**
 * Injection key used by parent components to share a single countdown timer with descendants.
 * When provided, nested consumers (e.g. `SFCountdown` inside `SFDealTimer`) reuse the same
 * reactive clock instead of spinning up their own interval.
 */
export const COUNTDOWN_TIMER_KEY: InjectionKey<CountdownTimerReturn> =
  Symbol('countdownTimer')

/**
 * Manages a countdown timer for promotional components.
 *
 * Drives a reactive clock that ticks every second on the client. All time
 * components and the display state are pure computeds over the clock and
 * the countdown target, so changes to `timeUntil` resync immediately.
 *
 * SSR-safe: the clock initializes to `0` on the server so nothing ticks and
 * `state` evaluates to `'finished'`. The client reads `Date.now()` on mount
 * and starts ticking. Consumers rendered during SSR should be wrapped in
 * `<ClientOnly>` so the server and client render matching markup.
 *
 * @param timeUntil - ISO date string for the countdown target.
 * @returns Reactive countdown state with time components.
 *
 * @example
 * ```ts
 * const { state, days, hours, minutes, seconds } = useCountdownTimer(promotion.schedule.to)
 * ```
 */
export function useCountdownTimer(
  timeUntil: MaybeRefOrGetter<string>,
): CountdownTimerReturn {
  const until = computed(() => Date.parse(toValue(timeUntil)))
  const now = shallowRef(import.meta.env.SSR ? 0 : Date.now())

  let timer: ReturnType<typeof setInterval> | undefined

  tryOnMounted(() => {
    now.value = Date.now()
    timer = setInterval(() => {
      now.value = Date.now()
    }, SECOND_MS)
  })

  tryOnScopeDispose(() => {
    if (timer) {
      clearInterval(timer)
    }
  })

  const remaining = computed(() => {
    if (now.value === 0 || !Number.isFinite(until.value)) {
      return 0
    }
    return Math.max(0, until.value - now.value)
  })

  const state = computed<CountdownState>(() => {
    if (remaining.value <= 0) {
      return 'finished'
    }
    if (remaining.value <= DAY_MS) {
      return 'urgent'
    }
    return 'standard'
  })

  const days = computed(() => Math.floor(remaining.value / DAY_MS))
  const hours = computed(() => Math.floor((remaining.value / HOUR_MS) % 24))
  const minutes = computed(() => Math.floor((remaining.value / MINUTE_MS) % 60))
  const seconds = computed(() => Math.floor((remaining.value / SECOND_MS) % 60))

  return { state, days, hours, minutes, seconds, remaining }
}
