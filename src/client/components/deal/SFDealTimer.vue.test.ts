import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { CSSProperties } from 'vue'
import { t } from '@test/mocks/vue-i18n'
import { COUNTDOWN_LOADER_UNITS } from '@client/utils/constants'
import SFDealTimer from './SFDealTimer.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const countdown = {
  state: ref<'standard' | 'urgent' | 'finished'>('standard'),
  days: ref(0),
  hours: ref(0),
  minutes: ref(0),
  seconds: ref(0),
}

vi.mock('@client/composables/useCountdownTimer', () => ({
  COUNTDOWN_TIMER_KEY: Symbol('countdownTimer'),
  useCountdownTimer: () => ({ ...countdown, remaining: ref(0) }),
}))

beforeEach(() => {
  countdown.state.value = 'standard'
  countdown.days.value = 0
  countdown.hours.value = 0
  countdown.minutes.value = 0
  countdown.seconds.value = 0
})

const baseStubs = {
  SFFadeInTransition: { template: '<div><slot /></div>' },
  SFSkeletonLoader: {
    template: '<span data-testid="skeleton-unit" />',
  },
  IconAvailabilityComingsoon: {
    template: '<span data-testid="icon" />',
  },
}

const mountedClientOnlyStub = {
  ClientOnly: { template: '<div><slot /></div>' },
}

const fallbackClientOnlyStub = {
  ClientOnly: { template: '<div><slot name="fallback" /></div>' },
}

const colorStyle: CSSProperties = { backgroundColor: '#000', color: '#fff' }

describe('SFDealTimer.vue', () => {
  it('renders the days left in standard state', async () => {
    countdown.state.value = 'standard'
    countdown.days.value = 3
    const wrapper = mount(SFDealTimer, {
      props: { timeUntil: new Date().toISOString(), colorStyle },
      global: {
        stubs: { ...baseStubs, ...mountedClientOnlyStub },
        mocks: { $t: t },
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('countdown.days_left(3)')
    expect(wrapper.text()).not.toContain('countdown.ends_in')
  })

  it('renders the zero-padded hours, minutes and seconds in urgent state', async () => {
    countdown.state.value = 'urgent'
    countdown.days.value = 0
    countdown.hours.value = 5
    countdown.minutes.value = 30
    countdown.seconds.value = 7
    const wrapper = mount(SFDealTimer, {
      props: { timeUntil: new Date().toISOString(), colorStyle },
      global: {
        stubs: { ...baseStubs, ...mountedClientOnlyStub },
        mocks: { $t: t },
      },
    })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('countdown.ends_in')
    expect(text).toContain('05global.hours_short(5)')
    expect(text).toContain('30global.minutes_short(30)')
    expect(text).toContain('07global.seconds_short(7)')
    expect(text).not.toContain('countdown.days_left')
  })

  it('hides the wrapper once finished after client mount', async () => {
    countdown.state.value = 'finished'
    const wrapper = mount(SFDealTimer, {
      props: { timeUntil: new Date().toISOString(), colorStyle },
      global: {
        stubs: { ...baseStubs, ...mountedClientOnlyStub },
        mocks: { $t: t },
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders skeleton fallback with the expected unit count before ClientOnly mounts', async () => {
    countdown.state.value = 'urgent'
    countdown.hours.value = 5
    const wrapper = mount(SFDealTimer, {
      props: { timeUntil: new Date().toISOString(), colorStyle },
      global: {
        stubs: { ...baseStubs, ...fallbackClientOnlyStub },
        mocks: { $t: t },
      },
    })
    await flushPromises()
    const skeletons = wrapper.findAll('[data-testid="skeleton-unit"]')
    expect(skeletons).toHaveLength(COUNTDOWN_LOADER_UNITS)
    const text = wrapper.text()
    expect(text).not.toContain('countdown.days_left')
    expect(text).not.toContain('countdown.ends_in')
  })
})
