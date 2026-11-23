import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ProductVariant } from '@scayle/storefront/types'
import {
  createMockProductVariant,
  createMockVariantPrice,
} from '@test/mock-data/products'
import { DropdownSize } from '@client/utils/constants'
import SFVariantPicker from './SFVariantPicker.vue'

// happy-dom lacks the Popover API the dropdown's directive relies on.
beforeAll(() => {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>
  proto.showPopover = vi.fn()
  proto.hidePopover = vi.fn()
  proto.togglePopover = vi.fn()
})

const t = (key: string) => {
  const map: Record<string, string> = {
    'variant_picker.select_size': 'Select size',
    'common.sold_out': 'Sold out',
  }
  return map[key] ?? key
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t }),
}))

const regularVariant = createMockProductVariant()

const discountedVariant = createMockProductVariant({
  id: 2,
  label: 'L',
  price: createMockVariantPrice({
    finalPrice: '€8.30',
    finalPriceInCents: 830,
    isOnSale: true,
    totalReduction: '-17%',
    showOriginally: true,
    strikeOriginally: true,
  }),
})

const soldOutVariant = createMockProductVariant({
  id: 3,
  label: 'XL',
  stock: 0,
  isSoldOut: true,
})

function mountPicker(
  variants: ProductVariant[],
  overrides: Record<string, unknown> = {},
) {
  return mount(SFVariantPicker, {
    props: { variants, visible: true, ...overrides },
    global: { mocks: { $t: t } },
  })
}

describe('SFVariantPicker.vue', () => {
  it('defaults the dropdown to the large size the product detail page uses', () => {
    const wrapper = mountPicker([regularVariant])

    expect(wrapper.getComponent({ name: 'SFDropdown' }).props('size')).toBe(
      DropdownSize.LG,
    )
  })

  // `SFDropdown` resolves option rows to the large size for every trigger size
  // but the small one. The slotted label and price follow the row size: left
  // large in compact rows, they forced a width floor into `SFDropdown` that
  // over-widened every other dropdown. Comparing the sizes instead of naming
  // their utilities keeps the test independent of the type scale.
  it('scales the option text down with the compact trigger only', () => {
    const priceClasses = (size: DropdownSize) =>
      mountPicker([regularVariant, discountedVariant], { size })
        .get(
          `[data-testid="variant-option-${regularVariant.id}"] [data-testid="variant-price"]`,
        )
        .classes()

    expect(priceClasses(DropdownSize.MD)).toEqual(priceClasses(DropdownSize.LG))
    expect(priceClasses(DropdownSize.SM)).not.toEqual(
      priceClasses(DropdownSize.LG),
    )
  })

  it('renders only a discounted variant price in the sale color', () => {
    const wrapper = mountPicker([regularVariant, discountedVariant])
    const priceOf = (variant: ProductVariant) =>
      wrapper.get(
        `[data-testid="variant-option-${variant.id}"] [data-testid="variant-price"]`,
      )

    expect(priceOf(discountedVariant).classes()).toContain('text-product-sale')
    expect(priceOf(regularVariant).classes()).not.toContain('text-product-sale')
  })

  it('shows "Sold out" instead of a price for sold-out variants', () => {
    const wrapper = mountPicker([regularVariant, soldOutVariant])
    const soldOutOption = wrapper.get(
      `[data-testid="variant-option-${soldOutVariant.id}"]`,
    )

    expect(soldOutOption.text()).toContain('Sold out')
    expect(soldOutOption.find('[data-testid="variant-price"]').exists()).toBe(
      false,
    )
  })

  it('appends "Sold out" to the accessible name of a sold-out option, but not an available one', () => {
    const wrapper = mountPicker([regularVariant, soldOutVariant])

    const available = wrapper.get(
      `[data-testid="variant-option-${regularVariant.id}"]`,
    )
    expect(available.attributes('aria-label')).not.toContain('Sold out')

    const soldOut = wrapper.get(
      `[data-testid="variant-option-${soldOutVariant.id}"]`,
    )
    expect(soldOut.attributes('aria-label')).toContain('Sold out')
  })

  it('shows a visible "(Sold out)" label on the trigger when the active variant is sold out', () => {
    const wrapper = mountPicker([soldOutVariant])

    expect(wrapper.text()).toContain('(Sold out)')
  })

  it('strikes every variant price when strikeThroughPrice is set', () => {
    const wrapper = mountPicker([regularVariant, discountedVariant], {
      strikeThroughPrice: true,
    })
    const prices = wrapper.findAll('[data-testid="variant-price"]')

    expect(prices).toHaveLength(2)
    for (const price of prices) {
      expect(price.classes()).toContain('line-through')
    }
  })

  it('shows the reduction label next to every option price when set', () => {
    const wrapper = mountPicker([regularVariant, discountedVariant], {
      strikeThroughPrice: true,
      reductionLabel: '-50%',
    })

    const reductions = wrapper.findAll('[data-testid="variant-reduction"]')
    expect(reductions).toHaveLength(2)
    expect(reductions.map((reduction) => reduction.text())).toEqual([
      '-50%',
      '-50%',
    ])
  })

  it('renders no reduction label when reductionLabel is absent', () => {
    const wrapper = mountPicker([regularVariant])

    expect(wrapper.find('[data-testid="variant-reduction"]').exists()).toBe(
      false,
    )
  })

  // The basket page sets this while the size change it started is still
  // running, so a second size cannot be picked against the line being replaced.
  it('blocks the trigger while disabled is set', () => {
    const wrapper = mountPicker([regularVariant, discountedVariant], {
      disabled: true,
    })

    expect(wrapper.get('[role="combobox"]').attributes('aria-disabled')).toBe(
      'true',
    )
  })

  it('blocks the trigger when there is nothing to pick', () => {
    const wrapper = mountPicker([])

    expect(wrapper.get('[role="combobox"]').attributes('aria-disabled')).toBe(
      'true',
    )
  })

  // A product with one size should show that size on the trigger. The basket
  // already knows the line's variant, so the same setup must not emit a
  // change the parent then has to ignore.
  it('preselects the only variant when the parent passed no selection', () => {
    const only = regularVariant
    const wrapper = mountPicker([only])

    expect(wrapper.emitted('update:activeVariant')).toEqual([[only]])
  })

  // Parents bind `v-model:active-variant`, so a pick has to leave the picker
  // as this event, not only as the inner dropdown's `update:modelValue`.
  it('emits the picked variant as its activeVariant model', async () => {
    const wrapper = mountPicker([regularVariant, discountedVariant])

    await wrapper
      .get(`[data-testid="variant-option-${discountedVariant.id}"]`)
      .trigger('click')

    expect(wrapper.emitted('update:activeVariant')).toEqual([
      [discountedVariant],
    ])
  })

  it('leaves a parent-supplied selection alone when there is only one variant', () => {
    const only = regularVariant
    const wrapper = mountPicker([only], { activeVariant: regularVariant })

    expect(wrapper.emitted('update:activeVariant')).toBeUndefined()
  })

  // The basket renders one picker per line, and `SFDropdown` builds its
  // trigger, listbox and option ids from this one id. A shared id pointed
  // `aria-controls` and `aria-activedescendant` at the first line's elements.
  it('gives each picker its own element ids', () => {
    // Mounted together, the way the basket renders them: `useId` counts per
    // app instance, so two separate `mount` calls would both start at zero and
    // the assertion would pass for the wrong reason.
    const wrapper = mount(
      {
        components: { SFVariantPicker },
        setup: () => ({ variants: [regularVariant, discountedVariant] }),
        template: `
          <div>
            <SFVariantPicker :variants="variants" :visible="true" />
            <SFVariantPicker :variants="variants" :visible="true" />
          </div>
        `,
      },
      { global: { mocks: { $t: t } } },
    )

    const [firstId, secondId] = wrapper
      .findAll('[role="combobox"]')
      .map((trigger) => trigger.attributes('aria-controls'))

    expect(wrapper.get(`[id="${firstId}"]`).attributes('role')).toBe('listbox')
    expect(wrapper.get(`[id="${secondId}"]`).attributes('role')).toBe('listbox')
    expect(firstId).not.toBe(secondId)
  })

  it('takes an accessible name from the caller when one is given', () => {
    const wrapper = mountPicker([regularVariant, discountedVariant], {
      ariaLabel: 'Change size for Sneaker',
    })

    expect(wrapper.get('[role="combobox"]').attributes('aria-label')).toBe(
      'Change size for Sneaker',
    )
  })

  it('falls back to the generic size label without one', () => {
    const wrapper = mountPicker([regularVariant, discountedVariant])

    expect(wrapper.get('[role="combobox"]').attributes('aria-label')).toBe(
      'Select size',
    )
  })

  it('shows no reduction on a sold-out option even when reductionLabel is set', () => {
    const wrapper = mountPicker([soldOutVariant], {
      strikeThroughPrice: true,
      reductionLabel: '-50%',
    })

    // The reduction sits inside `v-if="!isDisabled"`, so a sold-out option
    // shows only "Sold out" — never `-50%` next to it.
    expect(wrapper.text()).toContain('Sold out')
    expect(wrapper.find('[data-testid="variant-reduction"]').exists()).toBe(
      false,
    )
  })
})
