import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { resolvePaddingClass } from '@client/cms/shared/alignment'
import type { RecentlyViewedProductsComponent as RecentlyViewedProductsComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import RecentlyViewedProductsComponent from './RecentlyViewedProductsComponent.vue'

const cmsDirectives = { editable: vEditable }

const sliderStub = {
  template: '<div data-testid="rvp-slider" :class="$attrs.class" />',
  inheritAttrs: false,
}

const createContentElement = (
  padding?: RecentlyViewedProductsComponentType['padding'],
): RecentlyViewedProductsComponentType => ({
  _uid: 'rvp-1',
  component: 'RecentlyViewedProductsComponent',
  padding,
})

describe('RecentlyViewedProductsComponent', () => {
  it('passes the padding field to the padding classes', () => {
    // The size-to-class table is tested once in shared/alignment.test.ts.
    const wrapper = mount(RecentlyViewedProductsComponent, {
      props: { contentElement: createContentElement('large') },
      global: {
        stubs: { SFRecentlyViewedProductSlider: sliderStub },
        mocks: { $t: (key: string) => key },
        directives: cmsDirectives,
      },
    })

    expect(wrapper.get('[data-testid="rvp-slider"]').classes()).toEqual(
      expect.arrayContaining(resolvePaddingClass('large').split(' ')),
    )
  })
})
