import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SFLabelValue from './SFLabelValue.vue'

describe('SFLabelValue', () => {
  it('renders the label and value separated by a colon and a space', () => {
    const wrapper = mount(SFLabelValue, {
      props: { label: 'Order ID', value: '12345' },
    })

    expect(wrapper.text()).toBe('Order ID: 12345')
  })
})
