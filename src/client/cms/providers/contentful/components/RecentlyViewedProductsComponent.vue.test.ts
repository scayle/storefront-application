import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import { resolvePaddingClass } from '@client/cms/shared/alignment'
import RecentlyViewedProductsComponent from './RecentlyViewedProductsComponent.vue'

const sliderStub = {
  template: '<div data-testid="rvp-slider" :class="$attrs.class" />',
  inheritAttrs: false,
}

const createContentElement = (
  padding?: 'small' | 'medium' | 'large' | 'none',
) =>
  ({
    sys: {
      contentType: { sys: { id: 'RecentlyViewedProductsComponent' } },
    },
    fields: { padding },
  }) as unknown as TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse

describe('RecentlyViewedProductsComponent', () => {
  // The size-to-class map and its default are tested in
  // shared/alignment.test.ts; this proves the padding field reaches it.
  it('passes the authored padding to the padding class resolver', () => {
    const wrapper = mount(RecentlyViewedProductsComponent, {
      props: { contentElement: createContentElement('medium') },
      global: {
        stubs: { SFRecentlyViewedProductSlider: sliderStub },
        mocks: { $t: (key: string) => key },
      },
    })

    expect(wrapper.get('[data-testid="rvp-slider"]').classes()).toEqual(
      expect.arrayContaining(resolvePaddingClass('medium').split(' ')),
    )
  })
})
