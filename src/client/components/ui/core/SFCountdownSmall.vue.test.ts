import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import SFCountdownSmall from './SFCountdownSmall.vue'

const t = (key: string, count?: number) => {
  const suffix = typeof count === 'number' ? `:${count}` : ''
  return `${key}${suffix}`
}

const mockState = ref<'standard' | 'urgent' | 'finished'>('standard')
const mockDays = ref(3)

vi.mock('@client/composables/useCountdownTimer', () => ({
  COUNTDOWN_TIMER_KEY: Symbol('countdownTimer'),
  useCountdownTimer: () => ({
    state: computed(() => mockState.value),
    days: computed(() => mockDays.value),
    hours: ref(5),
    minutes: ref(30),
    seconds: ref(7),
    remaining: ref(0),
  }),
}))

beforeEach(() => {
  mockState.value = 'standard'
  mockDays.value = 3
})

describe('SFCountdownSmall.vue', () => {
  it('shows the "X Days left" label in the standard state', () => {
    const wrapper = mount(SFCountdownSmall, {
      props: { timeUntil: new Date().toISOString() },
      global: { mocks: { $t: t }, stubs: { SFCountdown: true } },
    })

    expect(wrapper.text()).toContain('countdown.days_left:3')
    expect(wrapper.findComponent({ name: 'SFCountdown' }).exists()).toBe(false)
  })

  it('renders SFCountdown without a prefix label in the urgent state', () => {
    mockState.value = 'urgent'
    const wrapper = mount(SFCountdownSmall, {
      props: { timeUntil: new Date().toISOString() },
      global: { mocks: { $t: t }, stubs: { SFCountdown: true } },
    })

    expect(wrapper.findComponent({ name: 'SFCountdown' }).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('countdown.days_left')
  })
})
