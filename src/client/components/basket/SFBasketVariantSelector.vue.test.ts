import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { BasketItem, ProductVariant } from '@scayle/storefront/types'
import { createMockBasketItem } from '@test/mock-data/basket'
import { createMockProductVariant } from '@test/mock-data/products'
import { t } from '@test/mocks/vue-i18n'

import SFBasketVariantSelector from './SFBasketVariantSelector.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const medium = createMockProductVariant({ id: 1, label: 'M' })
const large = createMockProductVariant({ id: 2, label: 'L' })

function createBasketItem(overrides: Partial<BasketItem> = {}): BasketItem {
  return createMockBasketItem({
    variant: medium,
    variants: [medium, large],
    ...overrides,
  })
}

/**
 * Declares the props the component binds, so `props()` reads resolve, and
 * relays the model event the component listens for.
 */
const VariantPickerStub = {
  template: '<div data-testid="variant-picker-stub" />',
  props: ['variants', 'activeVariant', 'size', 'disabled'],
  emits: ['update:activeVariant'],
}

/**
 * Reproduces `SFVariantPicker`'s single-variant behavior: it assigns its model
 * during setup, so the write reaches the selector before the card has mounted.
 */
const AutoSelectingVariantPickerStub = {
  template: '<div data-testid="variant-picker-stub" />',
  props: ['variants', 'activeVariant', 'size', 'disabled'],
  emits: ['update:activeVariant'],
  setup(
    props: { variants: ProductVariant[]; activeVariant?: ProductVariant },
    { emit }: { emit: (event: string, variant: ProductVariant) => void },
  ) {
    if (props.variants.length === 1 && !props.activeVariant) {
      emit('update:activeVariant', props.variants[0]!)
    }
  },
}

function mountSelector(
  item: BasketItem = createBasketItem(),
  loading = false,
  picker: object = VariantPickerStub,
) {
  return mount(SFBasketVariantSelector, {
    props: { item, loading },
    global: {
      stubs: { SFVariantPicker: picker },
      mocks: { $t: t },
    },
  })
}

describe('SFBasketVariantSelector', () => {
  it('offers the line size options as the pickable variants', () => {
    const picker = mountSelector().findComponent(VariantPickerStub)

    expect(picker.props('variants')).toEqual([medium, large])
  })

  // Matched by id: `variants` and `variant` are separate objects in the
  // Inertia payload even when they describe the same variant.
  it('preselects the variant the line currently holds', () => {
    // The line's variant and its `variants` entry are separate objects in
    // the Inertia payload and can carry different snapshots. Giving the line's
    // copy a different stock proves the selection comes from the options list,
    // which is the object the picker compares its list against — passing
    // `item.variant` through would leave the entry unmarked.
    const item = createBasketItem({
      variant: { ...large, stock: 99 },
    })
    const picker = mountSelector(item).findComponent(VariantPickerStub)

    expect(picker.props('activeVariant')).toMatchObject({
      id: 2,
      stock: large.stock,
    })
  })

  it('labels the control as the size of the line product', () => {
    const item = createBasketItem()
    const wrapper = mountSelector(item)

    expect(wrapper.get('[data-testid="label-value"]').text()).toContain(
      'product_attribute.size',
    )
    expect(
      wrapper
        .get('[data-testid="basket-variant-selector"]')
        .attributes('aria-label'),
    ).toBe(
      `basket.size_selector.a11y.select_size(${JSON.stringify({ name: item.product.name })})`,
    )
  })

  // The basket page performs the change: it owns the line's loading state and
  // the props reloaded alongside the basket.
  it('reports the pick instead of changing the line itself', async () => {
    const wrapper = mountSelector()

    await wrapper
      .findComponent(VariantPickerStub)
      .vm.$emit('update:activeVariant', large)
    await flushPromises()

    expect(wrapper.emitted('change')).toEqual([[2]])
  })

  it('ignores a selection of the size the line already holds', async () => {
    const wrapper = mountSelector()

    await wrapper
      .findComponent(VariantPickerStub)
      .vm.$emit('update:activeVariant', medium)
    await flushPromises()

    expect(wrapper.emitted('change')).toBeUndefined()
  })

  // A second pick would be made against a line the basket is about to replace.
  it('blocks the picker while a change is in flight', () => {
    const picker = mountSelector(createBasketItem(), true).findComponent(
      VariantPickerStub,
    )

    expect(picker.props('disabled')).toBe(true)
  })

  // A variant deactivated after the line was added drops out of the product's
  // variant list while staying on the line, so `variants` can hold neither
  // the purchased variant nor a match for its id. With exactly one other
  // variant left, `SFVariantPicker` assigns it during setup, and an id
  // comparison alone would read that write as a customer picking a new size.
  it("ignores the picker's own selection when the line variant is missing from the options", async () => {
    const item = createBasketItem({ variants: [large] })

    const wrapper = mountSelector(item, false, AutoSelectingVariantPickerStub)
    await flushPromises()

    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('still reports a size the customer picks after mount', async () => {
    const item = createBasketItem({ variants: [large] })
    const wrapper = mountSelector(item, false, AutoSelectingVariantPickerStub)
    await flushPromises()

    await wrapper
      .findComponent(AutoSelectingVariantPickerStub)
      .vm.$emit('update:activeVariant', large)
    await flushPromises()

    expect(wrapper.emitted('change')).toEqual([[2]])
  })

  // The selector stays usable on a sold-out line so the customer can switch to
  // a size that is in stock and return the item to the active basket.
  it('keeps the control enabled for a sold-out line', () => {
    const item = createBasketItem({
      variant: { ...medium, isSoldOut: true, stock: 0 },
      variants: [{ ...medium, isSoldOut: true, stock: 0 }, large],
    })

    expect(
      mountSelector(item).findComponent(VariantPickerStub).props('disabled'),
    ).toBe(false)
  })

  // The basket page puts focus back on this control after a size change
  // replaced the line, so the exposed handle has to reach the picker's trigger.
  it('focuses the picker through the exposed focus()', () => {
    const focus = vi.fn()
    const FocusablePickerStub = {
      template: '<div data-testid="variant-picker-stub" />',
      props: ['variants', 'activeVariant', 'size', 'disabled'],
      emits: ['update:activeVariant'],
      setup(_: unknown, { expose }: { expose: (exposed: object) => void }) {
        expose({ focus })
      },
    }

    const wrapper = mountSelector(
      createBasketItem(),
      false,
      FocusablePickerStub,
    )
    ;(wrapper.vm as unknown as { focus: () => void }).focus()

    expect(focus).toHaveBeenCalledTimes(1)
  })
})
