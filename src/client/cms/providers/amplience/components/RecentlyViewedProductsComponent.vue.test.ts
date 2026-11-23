import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { RecentlyViewedProductsComponent as RecentlyViewedProductsComponentType } from '@shared/types/cms/amplience'
import { resolvePaddingClass } from '@client/cms/shared/alignment'
import RecentlyViewedProductsComponent from './RecentlyViewedProductsComponent.vue'

const sliderStub = {
  template: '<div data-testid="rvp-slider" :class="$attrs.class" />',
  inheritAttrs: false,
}

const createContentElement = (padding?: string) =>
  ({
    _meta: { schema: 'x', deliveryId: 'rvp-1' },
    padding,
  }) as unknown as RecentlyViewedProductsComponentType

const mountComponent = (padding?: string) =>
  mount(RecentlyViewedProductsComponent, {
    props: { contentElement: createContentElement(padding) },
    global: {
      stubs: { SFRecentlyViewedProductSlider: sliderStub },
      mocks: { $t: (key: string) => key },
    },
  })

describe('Amplience RecentlyViewedProductsComponent', () => {
  // The size-to-class map is tested in shared/alignment.test.ts.
  it('applies the classes resolved from the authored padding', () => {
    const classes = mountComponent('medium')
      .get('[data-testid="rvp-slider"]')
      .classes()

    expect(classes).toEqual(
      expect.arrayContaining(resolvePaddingClass('medium').split(' ')),
    )
  })
})
