import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { createMockBasketItem } from '@test/mock-data/basket'
import { createMockProductVariant } from '@test/mock-data/products'
import { t } from '@test/mocks/vue-i18n'

import SFBasketCardDetails from './SFBasketCardDetails.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const sizeM = createMockProductVariant({ label: 'M' })

const SizeSelectorStub = {
  template: '<div data-testid="size-selector-stub" />',
  props: ['item', 'loading'],
  emits: ['change'],
}

const labelTexts = (wrapper: ReturnType<typeof mountDetails>) =>
  wrapper.findAll('[data-testid="label-value"]').map((row) => row.text())

function mountDetails(props: Record<string, unknown> = {}) {
  return mount(SFBasketCardDetails, {
    props: { basketItem: createMockBasketItem({ variant: sizeM }), ...props },
    global: {
      stubs: { SFBasketVariantSelector: SizeSelectorStub },
      mocks: { $t: t },
    },
  })
}

describe('SFBasketCardDetails', () => {
  // The mini-basket popover renders this component too, and size editing is
  // scoped to the basket page, so the plain label is the default.
  it('renders the size as a plain label by default', () => {
    const wrapper = mountDetails()

    expect(wrapper.findComponent(SizeSelectorStub).exists()).toBe(false)
    expect(labelTexts(wrapper)).toContain('product_attribute.size: M')
  })

  it('renders the size selector when size editing is enabled', () => {
    const wrapper = mountDetails({ sizeEditable: true })

    expect(wrapper.findComponent(SizeSelectorStub).exists()).toBe(true)
  })

  // A subscription line's definition was verified against the variant it was
  // added with, so the size stays fixed for the life of the subscription.
  it('keeps the plain label for a subscription line even when size editing is enabled', () => {
    const wrapper = mountDetails({
      sizeEditable: true,
      basketItem: createMockBasketItem({
        variant: sizeM,
        customData: {
          subscriptionDefinition: { subscriptionInterval: 'monthly' },
        },
      }),
    })

    expect(wrapper.findComponent(SizeSelectorStub).exists()).toBe(false)
    expect(labelTexts(wrapper)).toContain('product_attribute.size: M')
  })

  // The page blocks the line while its change runs; the selector only learns
  // about it through this relay.
  it('relays the line loading state to the selector', () => {
    const wrapper = mountDetails({ sizeEditable: true, loading: true })

    expect(wrapper.findComponent(SizeSelectorStub).props('loading')).toBe(true)
  })

  it('forwards a size change from the selector', async () => {
    const wrapper = mountDetails({ sizeEditable: true })

    await wrapper.findComponent(SizeSelectorStub).vm.$emit('change', 7)

    expect(wrapper.emitted('changeVariant')).toEqual([[7]])
  })

  // The basket page reaches the picker through the card, which reaches it
  // through this component.
  it('relays the exposed focus call to the selector', () => {
    const focus = vi.fn(() => true)
    const wrapper = mount(SFBasketCardDetails, {
      props: { basketItem: createMockBasketItem(), sizeEditable: true },
      global: {
        stubs: {
          SFBasketVariantSelector: {
            template: '<div data-testid="size-selector-stub" />',
            props: ['item', 'loading'],
            setup(_: unknown, { expose }: { expose: (e: object) => void }) {
              expose({ focus })
            },
          },
        },
        mocks: { $t: t },
      },
    })

    const focused = (
      wrapper.vm as unknown as { focusVariantSelector: () => boolean }
    ).focusVariantSelector()

    expect(focus).toHaveBeenCalledTimes(1)
    expect(focused).toBe(true)
  })

  // A subscription line renders the plain label, so there is no picker to take
  // focus. The page relies on the `false` to fall back to the remove button
  // rather than leaving focus on the document body.
  it('reports no focus target when the line renders no size selector', () => {
    const wrapper = mountDetails({
      basketItem: createMockBasketItem({
        customData: {
          subscriptionDefinition: { subscriptionInterval: 'monthly' },
        },
      }),
      sizeEditable: true,
    })

    expect(wrapper.find('[data-testid="size-selector-stub"]').exists()).toBe(
      false,
    )
    expect(
      (
        wrapper.vm as unknown as { focusVariantSelector: () => boolean }
      ).focusVariantSelector(),
    ).toBe(false)
  })

  it('shows the quantity only when asked', () => {
    expect(mountDetails().text()).not.toContain('global.quantity')
    expect(mountDetails({ isQuantityShown: true }).text()).toContain(
      'global.quantity',
    )
  })
})
