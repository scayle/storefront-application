import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { buildOrderDetailRoute } from '@shared/routes'
import { t } from '@test/mocks/vue-i18n'
import SFAccountOrderCard from './SFAccountOrderCard.vue'

// SFLink's own test covers what `disabled` does to the anchor; this stub
// declares the prop so the card's binding stays observable.
const LinkWithDisabledStub = defineComponent({
  name: 'SFLink',
  props: { to: { type: String, required: true }, disabled: Boolean },
  template: '<a :href="to"><slot /></a>',
})

const globalConfig = {
  stubs: {
    SFLink: LinkWithDisabledStub,
    SFAccountOrderStatus: {
      props: ['status'],
      template: '<span data-testid="order-status">{{ status }}</span>',
    },
    IconNavigationRight: true,
  },
  mocks: { $t: t },
}

describe('SFAccountOrderCard', () => {
  it('renders the order headline with the order ID', () => {
    const wrapper = mount(SFAccountOrderCard, {
      props: { id: 5779 },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="order-card-headline"]').text()).toBe(
      'account.orders.card.title({"id":5779})',
    )
  })

  it.for([
    {
      field: 'status',
      props: { status: 'payment_reserved' },
      selector: '[data-testid="order-status"]',
      value: 'payment_reserved',
    },
    {
      field: 'confirmation date',
      props: { confirmedAt: '25/12/2024' },
      selector: '[data-testid="order-card-date"] dd',
      value: '25/12/2024',
    },
    {
      field: 'item count',
      props: { itemCount: 7 },
      selector: '[data-testid="order-card-items"] dd',
      value: '7',
    },
  ] as const)(
    'shows only the $field when the order has no other details',
    ({ props, selector, value }) => {
      const wrapper = mount(SFAccountOrderCard, {
        props: { id: 1, ...props },
        global: globalConfig,
      })

      expect(wrapper.get(selector).text()).toBe(value)
      expect(
        [
          '[data-testid="order-status"]',
          '[data-testid="order-card-date"]',
          '[data-testid="order-card-items"]',
        ].filter((detail) => wrapper.find(detail).exists()),
      ).toHaveLength(1)
    },
  )

  it('leaves out the details list when the order has no date or item count', () => {
    const wrapper = mount(SFAccountOrderCard, {
      props: { id: 1 },
      global: globalConfig,
    })

    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('links to the order detail page and is named by its visible content', () => {
    const wrapper = mount(SFAccountOrderCard, {
      props: { id: 1337 },
      global: globalConfig,
    })

    const link = wrapper.get('[data-testid="order-card-1337"]')
    expect(link.attributes('href')).toBe(buildOrderDetailRoute(1337))
    expect(link.attributes('aria-label')).toBeUndefined()
  })

  it('marks the navigation control as decorative', () => {
    const wrapper = mount(SFAccountOrderCard, {
      props: { id: 1 },
      global: globalConfig,
    })

    expect(
      wrapper
        .get('[data-testid="order-card-detail-button"]')
        .attributes('aria-hidden'),
    ).toBe('true')
  })

  it('disables the link to the order when the card is disabled', () => {
    const wrapper = mount(SFAccountOrderCard, {
      props: { id: 1, disabled: true },
      global: globalConfig,
    })

    expect(wrapper.getComponent(LinkWithDisabledStub).props('disabled')).toBe(
      true,
    )
  })
})
