import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { t } from '@test/mocks/vue-i18n'

import SFBasketDeleteConfirmationModal from './SFBasketDeleteConfirmationModal.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

// Every way the real modal closes (close button, cancel action, Escape) clears
// its `visible` model and emits `close`, which this stub does from one button.
const SFModalStub = defineComponent({
  name: 'SFModal',
  emits: ['close', 'update:visible'],
  setup(_, { emit, slots }) {
    const close = () => {
      emit('update:visible', false)
      emit('close')
    }
    return () =>
      h('div', [
        h('button', { 'data-testid': 'close-button', onClick: close }, 'X'),
        slots.actions?.(),
      ])
  },
})

function mountModal(isConfirming = false) {
  return mount(SFBasketDeleteConfirmationModal, {
    props: { visible: true, isConfirming },
    global: { mocks: { $t: t }, stubs: { SFModal: SFModalStub } },
  })
}

describe('SFBasketDeleteConfirmationModal', () => {
  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mountModal()

    await wrapper
      .get('[data-testid="basket-remove-item-confirm-button"]')
      .trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([[]])
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('hides itself and emits cancel when the modal closes', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-testid="close-button"]').trigger('click')

    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    expect(wrapper.emitted('cancel')).toEqual([[]])
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  // A second click while the removal is in flight would remove the line again.
  it('blocks the confirm button while the removal is confirming', async () => {
    const wrapper = mountModal(true)
    const confirmButton = wrapper.get(
      '[data-testid="basket-remove-item-confirm-button"]',
    )

    await confirmButton.trigger('click')

    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(confirmButton.attributes('aria-busy')).toBe('true')
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})
