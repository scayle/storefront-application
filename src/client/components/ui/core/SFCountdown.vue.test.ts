import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import SFCountdown from './SFCountdown.vue'

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

describe('SFCountdown.vue', () => {
  it('renders separators between urgent units only when days === 0', () => {
    const wrapper = mount(SFCountdown, {
      props: {
        timeUntil: new Date().toISOString(),
        showUnits: true,
        showSeparators: true,
        unitSize: 'short',
      },
      global: { mocks: { $t: t } },
    })

    const colons = wrapper.findAll('span').filter((n) => n.text() === ':')
    expect(colons).toHaveLength(2)
  })

  it('omits separators when days > 0', () => {
    mockDays.value = 3
    const wrapper = mount(SFCountdown, {
      props: {
        timeUntil: new Date().toISOString(),
        showUnits: true,
        showSeparators: true,
        unitSize: 'short',
      },
      global: { mocks: { $t: t } },
    })

    const colons = wrapper.findAll('span').filter((n) => n.text() === ':')
    expect(colons).toHaveLength(0)
  })

  it('uses _short i18n keys when unitSize is "short"', () => {
    const wrapper = mount(SFCountdown, {
      props: {
        timeUntil: new Date().toISOString(),
        showUnits: true,
        unitSize: 'short',
      },
      global: { mocks: { $t: t } },
    })

    const text = wrapper.text()
    expect(text).toContain('global.hours_short:5')
    expect(text).toContain('global.minutes_short:30')
    expect(text).toContain('global.seconds_short:7')
    expect(text).not.toContain('global.hours:')
  })

  it('uses long i18n keys when unitSize is "long"', () => {
    const wrapper = mount(SFCountdown, {
      props: {
        timeUntil: new Date().toISOString(),
        showUnits: true,
        unitSize: 'long',
      },
      global: { mocks: { $t: t } },
    })

    const text = wrapper.text()
    expect(text).toContain('global.hours:5')
    expect(text).not.toContain('global.hours_short')
  })

  it('hides seconds when days > 0', () => {
    mockDays.value = 3
    const wrapper = mount(SFCountdown, {
      props: {
        timeUntil: new Date().toISOString(),
        showUnits: true,
        unitSize: 'short',
      },
      global: { mocks: { $t: t } },
    })

    const text = wrapper.text()
    expect(text).toContain('03')
    expect(text).not.toContain('global.seconds_short')
  })

  it('pads single-digit values to 2 characters', () => {
    const wrapper = mount(SFCountdown, {
      props: { timeUntil: new Date().toISOString() },
      global: { mocks: { $t: t } },
    })

    const text = wrapper.text()
    expect(text).toContain('05')
    expect(text).toContain('07')
  })

  it('emits "finished" once on state transition to finished', async () => {
    mockState.value = 'urgent'
    const wrapper = mount(SFCountdown, {
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
