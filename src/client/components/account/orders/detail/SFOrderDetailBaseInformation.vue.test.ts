import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Order } from '@scayle/storefront/types'
import {
  createMockOrder,
  defaultAddresses,
  separateAddresses,
} from '@test/mock-data/orders'
import { t } from '@test/mocks/vue-i18n'
import SFOrderDetailBaseInformation from './SFOrderDetailBaseInformation.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const mountInformation = (order: Order) =>
  mount(SFOrderDetailBaseInformation, {
    props: { order },
    global: {
      stubs: {
        SFOrderSuccessDetailBox: {
          props: ['title'],
          template: '<div><span>{{ title }}</span><slot /></div>',
        },
        SFOrderDetailAddressBox: {
          props: ['title', 'address'],
          template: '<div>{{ title }}</div>',
        },
      },
      mocks: { $t: t },
    },
  })

describe('SFOrderDetailBaseInformation', () => {
  it('renders the payment method of the order', () => {
    const wrapper = mountInformation(
      createMockOrder({ payment: [{ key: 'accounting' }] }),
    )

    expect(wrapper.text()).toContain('global.payment_key.accounting')
  })

  it('renders the default payment method when the order has no payment entry', () => {
    const wrapper = mountInformation(createMockOrder({ payment: [] }))

    expect(wrapper.text()).toContain('global.payment_key.default')
  })

  it('shows combined address title when addresses are the same', () => {
    const wrapper = mountInformation(
      createMockOrder({ address: defaultAddresses }),
    )

    expect(wrapper.text()).toContain(
      'account.order_detail.address_details.delivery_and_billing_address',
    )
    expect(wrapper.text()).not.toContain(
      'account.order_detail.address_details.billing_address',
    )
  })

  it('shows separate addresses when different', () => {
    const wrapper = mountInformation(
      createMockOrder({ address: separateAddresses }),
    )

    expect(wrapper.text()).toContain(
      'account.order_detail.address_details.delivery_address',
    )
    expect(wrapper.text()).toContain(
      'account.order_detail.address_details.billing_address',
    )
  })
})
