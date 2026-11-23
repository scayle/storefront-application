import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from '@client/utils/time'
import { useCountdownTimer } from './useCountdownTimer'

describe('useCountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('state determination', () => {
    it('returns "standard" when remaining time is greater than 24 hours', () => {
      const target = new Date(Date.now() + 3 * DAY_MS).toISOString()
      const { state, days } = useCountdownTimer(target)

      expect(state.value).toBe('standard')
      expect(days.value).toBe(3)
    })

    it('returns "urgent" when remaining time is 24 hours or less', () => {
      const target = new Date(Date.now() + 5 * HOUR_MS).toISOString() // 5 hours
      const { state, hours, minutes, seconds } = useCountdownTimer(target)

      expect(state.value).toBe('urgent')
      expect(hours.value).toBe(5)
      expect(minutes.value).toBe(0)
      expect(seconds.value).toBe(0)
    })

    it('returns "urgent" when remaining time is exactly 24 hours', () => {
      const target = new Date(Date.now() + DAY_MS).toISOString()
      const { state, remaining } = useCountdownTimer(target)

      expect(remaining.value).toBe(DAY_MS)
      expect(state.value).toBe('urgent')
    })

    it('returns "finished" when the target time is in the past', () => {
      const target = new Date(Date.now() - SECOND_MS).toISOString()
      const { state, remaining } = useCountdownTimer(target)

      expect(state.value).toBe('finished')
      expect(remaining.value).toBe(0)
    })

    it('returns "finished" with remaining 0 when timeUntil is an invalid date', () => {
      const { state, remaining } = useCountdownTimer('not-a-date')

      expect(remaining.value).toBe(0)
      expect(state.value).toBe('finished')
    })
  })

  describe('time components', () => {
    it('computes correct days for multi-day countdowns', () => {
      const target = new Date(
        Date.now() + 5 * DAY_MS + 3 * HOUR_MS,
      ).toISOString()
      const { days, hours } = useCountdownTimer(target)

      expect(days.value).toBe(5)
      expect(hours.value).toBe(3)
    })

    it('computes correct hours, minutes, seconds for sub-day countdowns', () => {
      const target = new Date(
        Date.now() + 10 * HOUR_MS + 30 * MINUTE_MS + 45 * SECOND_MS,
      ).toISOString()
      const { hours, minutes, seconds } = useCountdownTimer(target)

      expect(hours.value).toBe(10)
      expect(minutes.value).toBe(30)
      expect(seconds.value).toBe(45)
    })
  })

  describe('interval behavior', () => {
    it.for([
      ['urgent', 2 * HOUR_MS],
      ['standard', 3 * DAY_MS],
    ] as const)(
      'updates remaining every second in %s state',
      async ([stateName, remainingMs]) => {
        const target = new Date(Date.now() + remainingMs).toISOString()
        const { state, remaining } = useCountdownTimer(target)

        expect(state.value).toBe(stateName)
        const initialRemaining = remaining.value

        vi.advanceTimersByTime(SECOND_MS)
        await nextTick()

        expect(remaining.value).toBe(initialRemaining - SECOND_MS)
      },
    )

    it('does not update after finishing', async () => {
      const target = new Date(Date.now() + 2 * SECOND_MS).toISOString()
      const { state, remaining } = useCountdownTimer(target)

      expect(state.value).toBe('urgent')

      vi.advanceTimersByTime(3 * SECOND_MS)
      await nextTick()

      expect(state.value).toBe('finished')
      expect(remaining.value).toBe(0)

      vi.advanceTimersByTime(5 * SECOND_MS)
      await nextTick()

      expect(remaining.value).toBe(0)
    })
  })

  describe('state transitions', () => {
    it('transitions from standard to urgent at the 24h boundary', async () => {
      const target = new Date(Date.now() + DAY_MS + MINUTE_MS).toISOString() // 24h + 1min
      const { state } = useCountdownTimer(target)

      expect(state.value).toBe('standard')

      vi.advanceTimersByTime(MINUTE_MS + SECOND_MS)
      await nextTick()

      expect(state.value).toBe('urgent')
    })

    it('transitions from urgent to finished when time runs out', async () => {
      const target = new Date(Date.now() + 5 * SECOND_MS).toISOString()
      const { state } = useCountdownTimer(target)

      expect(state.value).toBe('urgent')

      vi.advanceTimersByTime(6 * SECOND_MS)
      await nextTick()

      expect(state.value).toBe('finished')
    })
  })

  describe('reactive timeUntil', () => {
    it('resyncs remaining and state immediately when the target changes', async () => {
      const target = ref(new Date(Date.now() + 3 * DAY_MS).toISOString())
      const { state, remaining } = useCountdownTimer(target)

      expect(state.value).toBe('standard')

      target.value = new Date(Date.now() + 2 * HOUR_MS).toISOString()
      await nextTick()

      expect(remaining.value).toBe(2 * HOUR_MS)
      expect(state.value).toBe('urgent')
    })

    it('picks up the new boundary when the target changes mid-flight', async () => {
      const target = ref(new Date(Date.now() + 3 * DAY_MS).toISOString())
      const { state } = useCountdownTimer(target)

      expect(state.value).toBe('standard')

      target.value = new Date(Date.now() + DAY_MS + MINUTE_MS).toISOString()
      await nextTick()

      expect(state.value).toBe('standard')

      vi.advanceTimersByTime(MINUTE_MS + SECOND_MS)
      await nextTick()

      expect(state.value).toBe('urgent')
    })
  })
})
