import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { OrderSummary } from '@scayle/storefront/types'
import { t } from '@test/mocks/vue-i18n'
import SFAccountOrdersList from './SFAccountOrdersList.vue'

const mockQuery = ref(new URLSearchParams())

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({
    query: mockQuery,
    path: ref('/account/orders'),
    baseUrl: ref('https://example.com'),
    fullPath: ref('https://example.com/account/orders'),
    hash: ref(''),
  }),
}))

const createOrders = (count: number): OrderSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    confirmedAt: '01/01/2025',
    itemCount: i + 2,
    status: 'payment_reserved' as const,
  }))

const globalConfig = {
  stubs: {
    SFAccountOrderCard: {
      props: ['id', 'confirmedAt', 'status', 'itemCount'],
      template: '<div :data-testid="\'order-card-\' + id">{{ id }}</div>',
    },
    SFButton: {
      template:
        '<button v-bind="$attrs" :disabled="$attrs.disabled"><slot /></button>',
      inheritAttrs: false,
    },
    IconNavigationLeft: { template: '<span />' },
    IconNavigationRight: { template: '<span />' },
  },
  mocks: { $t: t },
}

describe('SFAccountOrdersList', () => {
  beforeEach(() => {
    mockQuery.value = new URLSearchParams()
  })

  it('renders an order card for each item on the current page', () => {
    const items = createOrders(3)
    const wrapper = mount(SFAccountOrdersList, {
      props: { items },
      global: globalConfig,
    })

    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.find('[data-testid="order-card-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-card-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-card-3"]').exists()).toBe(true)
  })

  // Page slicing and query parsing are useClientPagination's contract
  // (useClientPagination.vue.test.ts); 100 orders exceed any shop's page size.
  it('shows the first page of orders with pagination when the orders do not fit on one page', () => {
    const wrapper = mount(SFAccountOrdersList, {
      props: { items: createOrders(100) },
      global: globalConfig,
    })

    const cards = wrapper.findAll('li')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThan(100)
    expect(cards[0]!.text()).toBe('1')
    expect(wrapper.find('[data-testid="client-pagination"]').exists()).toBe(
      true,
    )
  })

  it.for([
    { name: 'there are no orders', items: [], query: '' },
    {
      name: 'the page query is past the last page',
      items: createOrders(10),
      query: 'page=999',
    },
  ])('shows the empty state when $name', ({ items, query }) => {
    mockQuery.value = new URLSearchParams(query)

    const wrapper = mount(SFAccountOrdersList, {
      props: { items },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})
