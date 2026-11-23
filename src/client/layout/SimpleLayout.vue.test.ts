import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SimpleLayout from './SimpleLayout.vue'

// Mutable so individual tests can render the layout for a different page.
let mockComponent = 'Checkout'

vi.mock('@inertiajs/vue3', () => ({
  Head: {
    name: 'Head',
    template: '<div data-testid="inertia-head"><slot /></div>',
  },
  usePage: () => ({
    get component() {
      return mockComponent
    },
    props: {
      storefront: {
        config: { tenantSpace: 'test-space' },
      },
    },
  }),
}))

describe('SimpleLayout', () => {
  const defaultProps = {
    shopName: 'Test Shop',
    checkoutHeader: [],
    footer: { footer: [], bottomFooter: [] },
  }

  const stubs = {
    SFAnalyticsHead: { template: '<div />' },
    SFSimpleHeader: { template: '<div />' },
    SFBottomFooter: { template: '<div />' },
    SFSkipLink: { template: '<div />' },
  }

  const findPreconnectHrefs = (component: string) => {
    mockComponent = component

    const wrapper = mount(SimpleLayout, {
      props: defaultProps,
      global: { stubs },
    })

    return wrapper
      .findAll('[data-testid="inertia-head"]')
      .flatMap((head) => head.findAll('link'))
      .map((link) => link.attributes('href'))
  }

  const CHECKOUT_ORIGIN = 'https://test-space.checkout.api.scayle.cloud'

  it('preconnects to the checkout host on Checkout', () => {
    expect(findPreconnectHrefs('Checkout')).toEqual([CHECKOUT_ORIGIN])
  })

  // The other page on this layout loads the subscription script, not the
  // checkout one, so the handshake would go unused.
  it('omits the preconnect on SubscriptionCancellation', () => {
    expect(findPreconnectHrefs('SubscriptionCancellation')).toEqual([])
  })

  // The checkout web component renders its own `<main>`, so the layout must not
  // add a second landmark around it. The skip link target has to survive.
  it('renders the content wrapper as a div on Checkout', () => {
    mockComponent = 'Checkout'
    const wrapper = mount(SimpleLayout, {
      props: defaultProps,
      global: { stubs },
    })

    expect(wrapper.find('main').exists()).toBe(false)
    const target = wrapper.find('#main-content')
    expect(target.element.tagName).toBe('DIV')
    expect(target.attributes('tabindex')).toBe('-1')
  })

  it('renders the content wrapper as main on SubscriptionCancellation', () => {
    mockComponent = 'SubscriptionCancellation'
    const wrapper = mount(SimpleLayout, {
      props: defaultProps,
      global: { stubs },
    })

    expect(wrapper.find('main#main-content').exists()).toBe(true)
  })
})
