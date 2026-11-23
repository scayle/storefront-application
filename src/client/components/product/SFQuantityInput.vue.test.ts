import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SFQuantityInput from './SFQuantityInput.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en_GB',
  messages: {
    en_GB: {
      global: {
        quantity: 'Quantity',
      },
      quantity_input: {
        change_value_to: 'Change quantity to {newQuantity}',
      },
    },
  },
})

describe('SFQuantityInput.vue', () => {
  it('exposes spinbutton semantics with value bounds', () => {
    const wrapper = mount(SFQuantityInput, {
      props: {
        quantity: 2,
        maxQuantity: 5,
        minQuantity: 1,
      },
      global: { plugins: [i18n] },
    })

    const spinbutton = wrapper.get('[data-testid="quantity-selector"]')

    expect(spinbutton.attributes('role')).toBe('spinbutton')
    expect(spinbutton.attributes('aria-label')).toBe('Quantity')
    expect(spinbutton.attributes('aria-valuenow')).toBe('2')
    expect(spinbutton.attributes('aria-valuemin')).toBe('1')
    expect(spinbutton.attributes('aria-valuemax')).toBe('5')
    expect(spinbutton.attributes('tabindex')).toBe('0')
  })

  it('uses a custom accessible label when provided', () => {
    const wrapper = mount(SFQuantityInput, {
      props: {
        quantity: 1,
        maxQuantity: 3,
        label: 'Item quantity',
      },
      global: { plugins: [i18n] },
    })

    expect(
      wrapper.get('[data-testid="quantity-selector"]').attributes('aria-label'),
    ).toBe('Item quantity')
  })

  it('hides the visual value from assistive technologies', () => {
    const wrapper = mount(SFQuantityInput, {
      props: { quantity: 4, maxQuantity: 10 },
      global: { plugins: [i18n] },
    })

    expect(
      wrapper.get('[data-testid="quantity-value"]').attributes('aria-hidden'),
    ).toBe('true')
  })

  it('labels increment buttons with the target quantity', () => {
    const wrapper = mount(SFQuantityInput, {
      props: { quantity: 2, maxQuantity: 5 },
      global: { plugins: [i18n] },
    })

    expect(
      wrapper.get('[data-testid="quantity-minus"]').attributes('aria-label'),
    ).toBe('Change quantity to 1')
    expect(
      wrapper.get('[data-testid="quantity-plus"]').attributes('aria-label'),
    ).toBe('Change quantity to 3')
  })

  it('removes the spinbutton from tab order when disabled', () => {
    const wrapper = mount(SFQuantityInput, {
      props: { quantity: 2, maxQuantity: 5, disabled: true },
      global: { plugins: [i18n] },
    })

    const spinbutton = wrapper.get('[data-testid="quantity-selector"]')

    expect(spinbutton.attributes('tabindex')).toBe('-1')
    expect(spinbutton.attributes('aria-disabled')).toBe('true')
  })

  it('marks decrement aria-disabled at minimum quantity without native disabled', () => {
    const wrapper = mount(SFQuantityInput, {
      props: { quantity: 1, maxQuantity: 5, minQuantity: 1 },
      global: { plugins: [i18n] },
    })

    const decrement = wrapper.get('[data-testid="quantity-minus"]')
    const increment = wrapper.get('[data-testid="quantity-plus"]')

    expect(decrement.attributes('disabled')).toBeUndefined()
    expect(decrement.attributes('aria-disabled')).toBe('true')
    expect(increment.attributes('aria-disabled')).toBeUndefined()
  })

  it('does not emit when clicking decrement at minimum quantity', async () => {
    const wrapper = mount(SFQuantityInput, {
      props: { quantity: 1, maxQuantity: 5, minQuantity: 1 },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[data-testid="quantity-minus"]').trigger('click')

    expect(wrapper.emitted('update:quantity')).toBeUndefined()
  })

  it('does not emit when clicking increment at maximum quantity', async () => {
    const wrapper = mount(SFQuantityInput, {
      props: { quantity: 5, maxQuantity: 5, minQuantity: 1 },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[data-testid="quantity-plus"]').trigger('click')

    expect(wrapper.emitted('update:quantity')).toBeUndefined()
  })

  const clickPlus = (wrapper: VueWrapper) =>
    wrapper.get('[data-testid="quantity-plus"]').trigger('click')
  const pressArrowUp = (wrapper: VueWrapper) =>
    wrapper
      .get('[data-testid="quantity-selector"]')
      .trigger('keydown', { key: 'ArrowUp' })

  it.for([
    {
      input: 'a plus click',
      act: clickPlus,
      state: 'disabled',
      props: { disabled: true },
    },
    {
      input: 'ArrowUp',
      act: pressArrowUp,
      state: 'disabled',
      props: { disabled: true },
    },
    {
      input: 'a plus click',
      act: clickPlus,
      state: 'loading',
      props: { loading: true },
    },
    {
      input: 'ArrowUp',
      act: pressArrowUp,
      state: 'loading',
      props: { loading: true },
    },
  ])('ignores $input while $state', async ({ act, props }) => {
    const wrapper = mount(SFQuantityInput, {
      props: { quantity: 2, maxQuantity: 5, ...props },
      global: { plugins: [i18n] },
    })

    await act(wrapper)

    expect(wrapper.emitted('update:quantity')).toBeUndefined()
  })

  it('increments quantity on ArrowUp', async () => {
    const wrapper = mount(SFQuantityInput, {
      props: {
        quantity: 2,
        maxQuantity: 5,
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[data-testid="quantity-selector"]').trigger('keydown', {
      key: 'ArrowUp',
    })

    expect(wrapper.emitted('update:quantity')).toEqual([[3]])
  })

  it('returns focus to the spinbutton after a button click', async () => {
    const wrapper = mount(SFQuantityInput, {
      props: {
        quantity: 2,
        maxQuantity: 5,
      },
      global: { plugins: [i18n] },
    })

    const spinbutton = wrapper.get('[data-testid="quantity-selector"]')
      .element as HTMLElement
    const focusSpy = vi.spyOn(spinbutton, 'focus')

    await wrapper.get('[data-testid="quantity-plus"]').trigger('click')

    expect(focusSpy).toHaveBeenCalled()
  })
})
