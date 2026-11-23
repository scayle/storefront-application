/* eslint-disable vue/one-component-per-file -- shared stub module: intentionally groups related component stubs */
import { defineComponent, h, ref } from 'vue'
import type { Component } from 'vue'

/**
 * Page-level component stubs for the Basket page test. Extracted from
 * `Basket.vue.test.ts` so the same DOM contract (`data-testid` hooks, emitted
 * events, exposed `focus()`) is defined once and can be reused by any test that
 * mounts the basket surface.
 */

/**
 * Stub for `SFBasketCard`. Renders a remove button and a size trigger (exposing
 * `focus()` and `focusVariantSelector()` so focus-restoration tests can assert
 * `document.activeElement`) plus a quantity button.
 *
 * A line carrying `customData.subscriptionDefinition` renders no size trigger,
 * the rule the real card applies. `focusVariantSelector()` then reports
 * `false`, as the real card does, so the page's fallback can be exercised.
 *
 * The size trigger mirrors `SFDropdown`: a `tabindex="0"` combobox marked
 * `aria-disabled` while a change is in flight, so it keeps focus the way the
 * real one does rather than losing it to a native `disabled` button.
 *
 * Emits `delete`, `updateQuantity` and `changeVariant` mirroring the real card.
 */
export const SFBasketCardStub: Component = defineComponent({
  name: 'SFBasketCard',
  props: {
    item: { type: Object, required: true },
    loading: { type: Boolean, default: false },
  },
  emits: ['delete', 'updateQuantity', 'changeVariant'],
  setup(props, { emit, expose }) {
    const removeButton = ref<HTMLButtonElement | null>(null)
    const sizeButton = ref<HTMLElement | null>(null)
    expose({
      focus: () => removeButton.value?.focus(),
      focusVariantSelector: () => {
        if (!sizeButton.value) {
          return false
        }
        sizeButton.value.focus()
        return true
      },
    })

    return () =>
      h('div', { 'data-testid': 'basket-card' }, [
        h('button', {
          ref: removeButton,
          'data-testid': 'basket-remove-item-button',
          'data-item-key': (props.item as { key: string }).key,
          onClick: () => emit('delete'),
        }),
        h('button', {
          'data-testid': 'basket-quantity-button',
          disabled: props.loading,
          onClick: () => {
            if (!props.loading) {
              emit('updateQuantity', 2)
            }
          },
        }),
        (props.item as { customData?: { subscriptionDefinition?: unknown } })
          .customData?.subscriptionDefinition
          ? null
          : h('div', {
              ref: sizeButton,
              role: 'combobox',
              tabindex: '0',
              'data-testid': 'basket-size-button',
              'aria-disabled': props.loading || undefined,
              onClick: () => {
                if (!props.loading) {
                  emit('changeVariant', 999)
                }
              },
            }),
      ])
  },
})

/**
 * Stub for `SFEmptyBasket`. Renders the empty-state container plus a focusable CTA
 * so focus-after-last-removal tests can assert focus lands on the CTA.
 */
export const SFEmptyBasketStub: Component = defineComponent({
  name: 'SFEmptyBasket',
  setup() {
    return () =>
      h('div', { 'data-testid': 'empty-basket' }, [
        h('a', { href: '/', 'data-testid': 'empty-basket-cta' }, 'Continue'),
      ])
  },
})

/**
 * Stub for `SFBasketDeleteConfirmationModal`. Renders nothing unless `visible`;
 * when visible, exposes confirm and cancel buttons. Emits `confirm` and `cancel`.
 */
export const SFBasketDeleteConfirmationModalStub: Component = defineComponent({
  name: 'SFBasketDeleteConfirmationModal',
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['confirm', 'cancel', 'update:visible'],
  setup(props, { emit }) {
    return () => {
      if (!props.visible) {
        return null
      }

      return h('div', { 'data-testid': 'delete-confirm-modal' }, [
        h(
          'button',
          {
            'data-testid': 'basket-remove-item-confirm-button',
            onClick: () => emit('confirm'),
          },
          'Confirm',
        ),
        h(
          'button',
          {
            'data-testid': 'basket-remove-item-cancel-button',
            onClick: () => emit('cancel'),
          },
          'Cancel',
        ),
      ])
    }
  },
})
