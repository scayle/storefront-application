import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import SFCountdownLarge from './SFCountdownLarge.vue'

const t = (key: string, count?: number) => {
  const suffix = typeof count === 'number' ? `:${count}` : ''
  return `${key}${suffix}`
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t }),
}))

const mockState = ref<'standard' | 'urgent' | 'finished'>('urgent')
const mockDays = ref(0)
const mockHours = ref(5)
const mockMinutes = ref(30)
const mockSeconds = ref(7)

vi.mock('@client/composables/useCountdownTimer', () => ({
  COUNTDOWN_TIMER_KEY: Symbol('countdownTimer'),
  useCountdownTimer: () => ({
    state: computed(() => mockState.value),
    days: computed(() => mockDays.value),
    hours: computed(() => mockHours.value),
    minutes: computed(() => mockMinutes.value),
    seconds: computed(() => mockSeconds.value),
    remaining: ref(0),
  }),
}))

beforeEach(() => {
  mockState.value = 'urgent'
  mockDays.value = 0
  mockHours.value = 5
  mockMinutes.value = 30
  mockSeconds.value = 7
})

describe('SFCountdownLarge.vue', () => {
  it('shows a single day cell in the standard state', () => {
    mockState.value = 'standard'
    mockDays.value = 3
    const wrapper = mount(SFCountdownLarge, {
      props: { timeUntil: new Date().toISOString() },
      global: { mocks: { $t: t } },
    })

    const cells = wrapper.findAll('[data-testid="countdown-cell"]')
    expect(cells).toHaveLength(1)
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('global.days:3')
  })

  it('shows padded hours, minutes and seconds with their units instead of days in the urgent state', () => {
    const wrapper = mount(SFCountdownLarge, {
      props: { timeUntil: new Date().toISOString() },
      global: { mocks: { $t: t } },
    })

    const cells = wrapper
      .findAll('[data-testid="countdown-cell"]')
      .map((cell) => cell.text())
    expect(cells).toEqual([
      expect.stringMatching(/^05\s*global\.hours/),
      expect.stringMatching(/^30\s*global\.minutes/),
      expect.stringMatching(/^07\s*global\.seconds/),
    ])
  })

  it('puts a divider between neighboring urgent cells only', () => {
    const wrapper = mount(SFCountdownLarge, {
      props: { timeUntil: new Date().toISOString() },
      global: { mocks: { $t: t } },
    })

    const cells = wrapper.findAll('[data-testid="countdown-cell"]')
    expect(wrapper.findAll('[data-testid="countdown-divider"]')).toHaveLength(
      cells.length - 1,
    )
  })

  it('emits "finished" once on state transition to finished', async () => {
    const wrapper = mount(SFCountdownLarge, {
      props: { timeUntil: new Date().toISOString() },
      global: { mocks: { $t: t } },
    })
    await flushPromises()
    expect(wrapper.emitted('finished')).toBeUndefined()

    mockState.value = 'finished'
    await nextTick()

    expect(wrapper.emitted('finished')).toHaveLength(1)
  })
})
