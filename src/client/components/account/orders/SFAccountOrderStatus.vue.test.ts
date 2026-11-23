import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { OrderStatus } from '@scayle/storefront/types'
import SFAccountOrderStatus from './SFAccountOrderStatus.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const mountStatus = (status: OrderStatus, disabled?: boolean) =>
  mount(SFAccountOrderStatus, { props: { status, disabled } })

describe('SFAccountOrderStatus', () => {
  it.for([
    ['order_open', 'account.orders.status.open'],
    ['payment_pending', 'account.orders.status.open'],
    ['payment_reserved', 'account.orders.status.confirmed'],
    ['invoice_partially_completed', 'account.orders.status.confirmed'],
    ['invoice_completed', 'account.orders.status.shipped'],
    ['cancellation_pending', 'account.orders.status.cancelled'],
    ['cancellation_completed', 'account.orders.status.cancelled'],
  ] as const)('labels the %s status with %s', ([status, label]) => {
    expect(mountStatus(status).get('[data-testid="order-status"]').text()).toBe(
      label,
    )
  })

  it('shows the raw status when the Customer Account API returns a status the badge does not know', () => {
    // A status added to the API after this release reaches the badge before
    // the `OrderStatus` union and the label map are updated.
    const wrapper = mountStatus('return_requested' as OrderStatus)

    expect(wrapper.get('[data-testid="order-status"]').text()).toBe(
      'return_requested',
    )
  })

  // The text color is the only cue that the badge belongs to a disabled order card.
  it('shows the label in the disabled state when the order card is disabled', () => {
    expect(
      mountStatus('order_open', true)
        .get('[data-testid="order-status"]')
        .classes(),
    ).toContain('text-disabled')
  })

  it('hides the status dot from assistive tech, so only the label is announced', () => {
    const badge = mountStatus('order_open').get('[data-testid="order-status"]')
    const decorations = [...badge.element.children]

    expect(decorations).not.toHaveLength(0)
    expect(
      decorations.every(
        (child) => child.getAttribute('aria-hidden') === 'true',
      ),
    ).toBe(true)
  })
})
