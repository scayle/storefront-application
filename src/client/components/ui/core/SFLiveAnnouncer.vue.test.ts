import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useAnnouncer } from '@client/composables/useAnnouncer'
import SFLiveAnnouncer from './SFLiveAnnouncer.vue'

const { announce, clear } = useAnnouncer()

describe('SFLiveAnnouncer', () => {
  beforeEach(() => {
    clear()
  })

  afterEach(() => {
    clear()
  })

  it('renders both a polite and an assertive live region', () => {
    const wrapper = mount(SFLiveAnnouncer)

    expect(
      wrapper.get('[data-testid="live-announcer-polite"]').attributes(),
    ).toMatchObject({
      role: 'status',
      'aria-live': 'polite',
    })
    expect(
      wrapper.get('[data-testid="live-announcer-assertive"]').attributes(),
    ).toMatchObject({
      role: 'alert',
      'aria-live': 'assertive',
    })
  })

  it('reflects a polite announcement in the polite region only', async () => {
    const wrapper = mount(SFLiveAnnouncer)

    announce('12 products found')
    // The message is written synchronously; let Vue re-render the region.
    await nextTick()

    expect(wrapper.get('[data-testid="live-announcer-polite"]').text()).toBe(
      '12 products found',
    )
    expect(wrapper.get('[data-testid="live-announcer-assertive"]').text()).toBe(
      '',
    )
  })

  it('reflects an assertive announcement in the assertive region only', async () => {
    const wrapper = mount(SFLiveAnnouncer)

    announce('Request failed', { politeness: 'assertive' })
    // The message is written synchronously; let Vue re-render the region.
    await nextTick()

    expect(wrapper.get('[data-testid="live-announcer-assertive"]').text()).toBe(
      'Request failed',
    )
    expect(wrapper.get('[data-testid="live-announcer-polite"]').text()).toBe('')
  })
})
