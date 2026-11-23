import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFCountBadge from './SFCountBadge.vue'

describe('SFCountBadge', () => {
  it('renders the count when greater than 0', () => {
    const wrapper = mount(SFCountBadge, { props: { count: 5 } })

    expect(wrapper.find('span').exists()).toBe(true)
    expect(wrapper.text()).toBe('5')
  })

  it('renders nothing when the count is 0', () => {
    const wrapper = mount(SFCountBadge, { props: { count: 0 } })

    expect(wrapper.find('span').exists()).toBe(false)
  })

  it('renders nothing for negative counts', () => {
    const wrapper = mount(SFCountBadge, { props: { count: -1 } })

    expect(wrapper.find('span').exists()).toBe(false)
  })
})
