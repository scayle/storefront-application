import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { CountdownTimerComponent as CountdownTimerComponentType } from '@shared/types/cms/amplience'
import CountdownTimerComponent from './CountdownTimerComponent.vue'

const endDate = new Date(Date.now() + 60_000).toISOString()

const stubs = {
  ClientOnly: { template: '<div><slot /></div>' },
  SFCountdownSmall: {
    template: '<div data-testid="small" v-bind="$attrs" />',
    props: ['timeUntil'],
  },
  SFCountdownLarge: {
    template: '<div data-testid="large" v-bind="$attrs" />',
    props: ['timeUntil'],
  },
  SFCountdownSkeleton: {
    template: '<div data-testid="skeleton" v-bind="$attrs" />',
  },
}

const mountTimer = (
  contentElement: Partial<CountdownTimerComponentType>,
  attrs?: Record<string, unknown>,
) =>
  mount(CountdownTimerComponent, {
    props: {
      contentElement: {
        _meta: { schema: 'x', deliveryId: 'countdown-1' },
        ...contentElement,
      } as CountdownTimerComponentType,
    },
    attrs,
    global: { stubs },
  })

describe('Amplience CountdownTimerComponent', () => {
  it('renders the small variant by default', () => {
    const wrapper = mountTimer({ end_date: endDate })

    expect(wrapper.find('[data-testid="small"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="large"]').exists()).toBe(false)
  })

  it('renders the large variant when the author opts in', () => {
    const wrapper = mountTimer({ end_date: endDate, size: 'large' })

    expect(wrapper.find('[data-testid="large"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="small"]').exists()).toBe(false)
  })

  it('reads the target moment from the snake_case Amplience field', () => {
    const timer = mountTimer({ end_date: endDate }).findComponent(
      stubs.SFCountdownSmall,
    )

    expect(timer.props('timeUntil')).toBe(endDate)
  })

  it('renders nothing when the author has not set an end date', () => {
    const wrapper = mountTimer({})

    expect(wrapper.find('[data-testid="small"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="large"]').exists()).toBe(false)
  })

  it('forwards fallthrough attrs, which SectionComponent relies on for block spacing', () => {
    const wrapper = mountTimer({ end_date: endDate }, { class: 'mt-auto' })

    expect(wrapper.find('[data-testid="small"]').classes()).toContain('mt-auto')
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    const root = mountTimer({ end_date: endDate }).find('[data-testid="small"]')

    expect(root.attributes('data-amplience-entry-id')).toBe('countdown-1')
    expect(root.attributes('data-amplience-field-id')).toBe('end_date')
  })
})
