import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import type { Promotion } from '@scayle/storefront/types'
import { createMockPromotion } from '@test/mock-data/promotions'
import { t } from '@test/mocks/vue-i18n'

import SFBasketPromotionCodes from './SFBasketPromotionCodes.vue'

const promotionCodeMocks = vi.hoisted(() => ({
  enterPromotionCode: vi.fn(),
  removePromotionCode: vi.fn(),
}))

const pendingState = vi.hoisted(() => ({
  isApplying: false,
  removingPromotionId: undefined as string | undefined,
}))

vi.mock('@client/composables/usePromotionCode', () => ({
  usePromotionCode: () => ({
    currentCode: ref(''),
    isApplying: ref(pendingState.isApplying),
    isRemoving: (promotionId: string) =>
      promotionId === pendingState.removingPromotionId,
    ...promotionCodeMocks,
  }),
}))

const globalStubs = {
  // Binds the listeners to the input, as the real text input does.
  SFTextInput: {
    inheritAttrs: false,
    template: '<div><input v-bind="$attrs" /><slot name="trailing" /></div>',
  },
  SFButton: {
    emits: ['click'],
    template:
      '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  IconIncrementPlus: true,
  IconNavigationClose: true,
}

function mountComponent(promotionCodes: Promotion[] = []) {
  return mount(SFBasketPromotionCodes, {
    props: { promotionCodes },
    global: { stubs: globalStubs, mocks: { $t: t } },
  })
}

const removeButtonLabel = (code: string) =>
  t('basket_promotion_codes.remove_code', { code })

describe('SFBasketPromotionCodes', () => {
  it('renders a removable chip per applied promotion code', () => {
    const wrapper = mountComponent([
      createMockPromotion({ id: 'promo-1', code: 'SAVE10' }),
      createMockPromotion({ id: 'promo-2', code: 'WELCOME' }),
    ])

    expect(wrapper.text()).toContain('SAVE10')
    expect(wrapper.text()).toContain('WELCOME')
    expect(
      wrapper
        .findAll('button[aria-label^="basket_promotion_codes.remove_code"]')
        .map((button) => button.attributes('aria-label')),
    ).toEqual([removeButtonLabel('SAVE10'), removeButtonLabel('WELCOME')])
  })

  it('removes a promotion by its id when the chip button is clicked', async () => {
    const wrapper = mountComponent([
      createMockPromotion({ id: 'promo-42', code: 'SAVE10' }),
    ])

    await wrapper
      .get('button[aria-label^="basket_promotion_codes.remove_code"]')
      .trigger('click')

    expect(promotionCodeMocks.removePromotionCode).toHaveBeenCalledWith(
      'promo-42',
    )
  })

  it('extends the pointer target of the remove button to 24px', () => {
    const wrapper = mountComponent([createMockPromotion({ code: 'SAVE10' })])

    const removeButton = wrapper.get(
      'button[aria-label^="basket_promotion_codes.remove_code"]',
    )

    expect(removeButton.classes()).toContain('hit-area-min')
  })

  it('applies the entered code when Enter is pressed in the input', async () => {
    const wrapper = mountComponent()

    await wrapper.get('input').trigger('keydown', { key: 'Enter' })

    expect(promotionCodeMocks.enterPromotionCode).toHaveBeenCalledOnce()
  })

  it('applies the entered code when the add button is clicked', async () => {
    const wrapper = mountComponent()

    await wrapper.get('[data-testid="promotion-code-add"]').trigger('click')

    expect(promotionCodeMocks.enterPromotionCode).toHaveBeenCalledOnce()
  })

  it('sets the add button and only the chip that is being removed to loading', () => {
    pendingState.isApplying = true
    pendingState.removingPromotionId = 'promo-2'
    onTestFinished(() => {
      pendingState.isApplying = false
      pendingState.removingPromotionId = undefined
    })

    const wrapper = mountComponent([
      createMockPromotion({ id: 'promo-1', code: 'SAVE10' }),
      createMockPromotion({ id: 'promo-2', code: 'WELCOME' }),
    ])

    expect(
      wrapper.get('[data-testid="promotion-code-add"]').attributes('loading'),
    ).toBe('true')
    expect(
      wrapper
        .findAll('button[aria-label^="basket_promotion_codes.remove_code"]')
        .map((button) => button.attributes('loading')),
    ).toEqual(['false', 'true'])
  })
})
