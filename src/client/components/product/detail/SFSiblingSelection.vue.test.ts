import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ProductSibling, DetailedProduct } from '@scayle/storefront/types'
import { t } from '@test/mocks/vue-i18n'
import { createMockDetailedProduct } from '@test/mock-data/products'
import SFSiblingSelection from './SFSiblingSelection.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

function getLabelText(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('[data-testid="label-value"]').text()
}

/** Builds the alt text the swatch of `sibling` should carry, from the echoed translation keys. */
function expectedAltText(
  key:
    | 'sibling_selection.a11y.alt_text'
    | 'sibling_selection.a11y.sold_out_alt_text',
  sibling: Pick<ProductSibling, 'name' | 'color' | 'brand'>,
  selected: 'sibling_selection.selected' | 'sibling_selection.unselected',
) {
  return t(key, {
    alt: t('product_image.alt', {
      productName: sibling.name,
      colors: sibling.color,
      brand: sibling.brand,
    }),
    selected,
  })
}

function getSiblingLinks(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-testid="product-sibling-link"]')
}

function getSiblingImages(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-testid="product-sibling-image"]')
}

describe('sFSiblingSelection', () => {
  const defaultStubs = {
    SFItemSlider: {
      template: `<div>
        <slot name="header"></slot>
        <div class="slider"><slot></slot></div>
        <slot name="arrows" :is-prev-enabled="true" :is-next-enabled="true" :is-scrollable="true" :prev="() => {}" :next="() => {}"></slot>
      </div>`,
    },
    // Like the real link, only `click` is a declared emit; every other
    // listener reaches the anchor through `$attrs`.
    SFLink: {
      inheritAttrs: false,
      props: ['disabled'],
      emits: ['click'],
      template: `<a
        data-testid="product-sibling-link"
        v-bind="$attrs"
        :aria-disabled="disabled ? 'true' : undefined"
        @click="$emit('click', $event)"
      ><slot /></a>`,
    },
    // Shows only the color value, so a test reads the label without the
    // label component's own markup.
    SFLabelValue: {
      props: ['label', 'value'],
      template: '<p data-testid="label-value">{{ value }}</p>',
    },
    SFProductThumbnail: {
      props: ['alt', 'applyPadding', 'url'],
      template:
        '<img data-testid="product-sibling-image" :alt="alt" :data-apply-padding="applyPadding" :data-url="url">',
    },
    SFButton: {
      template:
        '<button type="button" :aria-label="ariaLabel"><slot></slot></button>',
      props: ['ariaLabel'],
    },
    IconNavigationLeft: { template: '<span></span>' },
    IconNavigationRight: { template: '<span></span>' },
  }

  const defaultGlobal = {
    stubs: defaultStubs,
    mocks: { $t: t },
  }

  describe('label computed', () => {
    it('shows default label from selected sibling when hovered label is empty', () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      expect(getLabelText(wrapper)).toBe('black')
    })

    it('label switches on hover and resets on mouse leave', async () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      expect(getLabelText(wrapper)).toBe('black')

      const links = getSiblingLinks(wrapper)
      await links[1]!.trigger('mouseenter')
      expect(getLabelText(wrapper)).toBe('navy')

      await links[2]!.trigger('mouseenter')
      expect(getLabelText(wrapper)).toBe('purple')

      await links[2]!.trigger('mouseleave')
      expect(getLabelText(wrapper)).toBe('black')
    })

    it('label switches on keyboard focus and resets on blur', async () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      const links = getSiblingLinks(wrapper)
      await links[1]!.trigger('focus')
      expect(getLabelText(wrapper)).toBe('navy')

      await links[1]!.trigger('blur')
      expect(getLabelText(wrapper)).toBe('black')
    })

    it('shows sibling_error translation when hovering sibling with no colors', async () => {
      const base = createMockDetailedProduct()
      const product: DetailedProduct = {
        ...base,
        siblings: [
          {
            ...base.siblings[0],
            id: 2,
            color: '',
          } as ProductSibling,
        ],
      }
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      // links[0] is the active product (re-added by the component); links[1] is
      // the no-colors sibling.
      const links = getSiblingLinks(wrapper)
      await links[1]!.trigger('mouseenter')
      expect(getLabelText(wrapper)).toBe('sibling_selection.sibling_error')
    })
  })

  describe('siblingAltText', () => {
    it('uses sold_out_alt_text for sold-out siblings', () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      const images = getSiblingImages(wrapper)
      const soldOutIndex = product.siblings.findIndex((s) => s.isSoldOut)
      // The active product is rendered first, so siblings are offset by one.
      const alt = images[soldOutIndex + 1]!.attributes('alt')

      expect(alt).toBe(
        expectedAltText(
          'sibling_selection.a11y.sold_out_alt_text',
          product.siblings[soldOutIndex]!,
          'sibling_selection.unselected',
        ),
      )
    })

    it('uses alt_text for available siblings', () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      const images = getSiblingImages(wrapper)
      // The active product is rendered first, so siblings are offset by one.
      const availableIndex = product.siblings.findIndex((s) => !s.isSoldOut) + 1
      const alt = images[availableIndex]!.attributes('alt')

      expect(alt).toContain('sibling_selection.a11y.alt_text')
      expect(alt).not.toContain('sold_out')
    })

    it('uses selected translation for current product sibling', () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      // The active product is rendered first.
      const alt = getSiblingImages(wrapper)[0]!.attributes('alt')

      expect(alt).toBe(
        expectedAltText(
          'sibling_selection.a11y.alt_text',
          product,
          'sibling_selection.selected',
        ),
      )
    })
  })

  describe('accessibility', () => {
    it('exposes the sibling links as a labelled <nav> landmark', () => {
      const wrapper = mount(SFSiblingSelection, {
        props: { product: createMockDetailedProduct() },
        global: defaultGlobal,
      })

      const group = wrapper.find('[data-testid="sibling-link-group"]')
      const label = wrapper.find('[data-testid="label-value"]')

      expect(group.element.tagName).toBe('NAV')
      expect(group.attributes('aria-labelledby')).toBe(label.attributes('id'))
    })

    it('marks the loaded PDP sibling with aria-current page only', () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      // The active product is re-added by the component and rendered first.
      const links = getSiblingLinks(wrapper)

      expect(links[0]!.attributes('aria-current')).toBe('page')
      expect(links[0]!.attributes('role')).toBeUndefined()
      expect(links[0]!.attributes('aria-checked')).toBeUndefined()
      expect(links[1]!.attributes('aria-current')).toBeUndefined()
    })

    it.for([
      {
        when: 'a sibling is available',
        allSoldOut: false,
        tabindex: '-1',
        role: undefined,
        label: undefined,
      },
      {
        when: 'every sibling is sold out',
        allSoldOut: true,
        tabindex: '0',
        role: 'group',
        label: 'product_attribute.color',
      },
    ])(
      'gives the scroller tabindex $tabindex and label $label when $when',
      ({ allSoldOut, tabindex, role, label }) => {
        const product = createMockDetailedProduct()
        const wrapper = mount(SFSiblingSelection, {
          props: {
            product: allSoldOut
              ? {
                  ...product,
                  isSoldOut: true,
                  siblings: product.siblings.map((sibling) => ({
                    ...sibling,
                    isSoldOut: true,
                  })),
                }
              : product,
          },
          global: {
            ...defaultGlobal,
            stubs: { ...defaultStubs, SFItemSlider: false },
          },
        })

        const scroller = wrapper.get('[data-testid="items-slider-scrollable"]')

        expect(scroller.attributes('tabindex')).toBe(tabindex)
        expect(scroller.attributes('role')).toBe(role)
        expect(scroller.attributes('aria-label')).toBe(label)
      },
    )

    it('marks sold-out siblings as aria-disabled', () => {
      const product = createMockDetailedProduct()
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      // The active product is rendered first, so siblings are offset by one.
      const soldOutIndex = product.siblings.findIndex((s) => s.isSoldOut) + 1
      const link = getSiblingLinks(wrapper)[soldOutIndex]

      expect(link!.attributes('aria-disabled')).toBe('true')
    })

    it('uses context-specific labels on overflow navigation buttons', () => {
      const wrapper = mount(SFSiblingSelection, {
        props: { product: createMockDetailedProduct() },
        global: defaultGlobal,
      })

      const buttons = wrapper.findAll('button')
      const labels = buttons.map((button) => button.attributes('aria-label'))

      expect(labels).toContain('sibling_selection.a11y.previous_color')
      expect(labels).toContain('sibling_selection.a11y.next_color')
    })
  })

  describe('edge case: sibling with no colors', () => {
    it('renders and uses empty color string in alt for sibling with no colors', () => {
      const base = createMockDetailedProduct()
      const product = createMockDetailedProduct({
        siblings: [
          {
            ...base.siblings[0],
            id: 2,
            name: 'Product One',
            color: '',
          } as ProductSibling,
        ],
      })
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      // links[0] is the active product; the no-colors sibling renders at index 1.
      const images = getSiblingImages(wrapper)
      expect(images).toHaveLength(2)
      expect(images[1]!.attributes('alt')).toBe(
        expectedAltText(
          'sibling_selection.a11y.alt_text',
          { name: 'Product One', color: '', brand: base.siblings[0]!.brand },
          'sibling_selection.unselected',
        ),
      )
    })
  })

  describe('image urls', () => {
    it('shows the active product with its first image and each sibling with its own image', () => {
      const product = createMockDetailedProduct({
        images: [
          { url: 'black-front.avif', name: 'front', applyPadding: false },
          { url: 'black-back.avif', name: 'back', applyPadding: false },
        ],
      })
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      const images = getSiblingImages(wrapper)
      // images[0] is the active product, rendered with its first detail image.
      expect(images[0]!.attributes('data-url')).toBe('black-front.avif')
      expect(images[1]!.attributes('data-url')).toBe(
        product.siblings[0]!.image!.url,
      )
    })
  })

  describe('image padding', () => {
    it('forwards the sibling image applyPadding flag to the thumbnail', () => {
      const base = createMockDetailedProduct()
      const product = createMockDetailedProduct({
        siblings: [
          {
            ...base.siblings[0],
            image: { ...base.siblings[0]!.image!, applyPadding: true },
          } as ProductSibling,
        ],
      })
      const wrapper = mount(SFSiblingSelection, {
        props: { product },
        global: defaultGlobal,
      })

      // images[0] is the active product, whose own image is not padded.
      const images = getSiblingImages(wrapper)
      expect(images[0]!.attributes('data-apply-padding')).toBe('false')
      expect(images[1]!.attributes('data-apply-padding')).toBe('true')
    })
  })
})
