import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFImageViewSelection from './SFImageViewSelection.vue'
import SFListingImageViewSelection from './SFListingImageViewSelection.vue'

const mountSelection = (options: { value: string; label: string }[]) =>
  mount(SFListingImageViewSelection, {
    props: { options },
    global: { stubs: { SFImageViewSelection: true } },
  })

describe('SFListingImageViewSelection', () => {
  it('renders the image view selector with the options the shop offers', () => {
    const options = [{ value: 'type-a', label: 'Type A' }]

    const wrapper = mountSelection(options)

    expect(wrapper.getComponent(SFImageViewSelection).props('options')).toEqual(
      options,
    )
  })

  it('renders nothing when the shop offers no image views', () => {
    const wrapper = mountSelection([])

    expect(wrapper.findComponent(SFImageViewSelection).exists()).toBe(false)
  })
})
