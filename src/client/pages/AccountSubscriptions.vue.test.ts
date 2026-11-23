import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import { SFAccountLayoutStub } from '../../test/utils/stubs'
import AccountSubscriptions from './AccountSubscriptions.vue'

vi.mock('@client/composables/useSubscriptionWebComponentScript', () => ({
  useSubscriptionWebComponentScript: () => undefined,
}))

// The shop country id reaches the page through Inertia shared props, so the
// composable that reads them stands in for the shared-props payload here.
vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    // A real `ref` so the template unwraps it the way it unwraps the composable's
    // `computed`.
    config: ref({ country: { shopCountryId: 1001 } }),
  }),
}))

// Render ClientOnly's default slot so the web component reaches the DOM (its
// real behavior is client-only; the stub mirrors the mounted state).
const ClientOnlyStub = defineComponent({
  name: 'ClientOnly',
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

const globalConfig = {
  stubs: {
    SFAccountLayout: SFAccountLayoutStub,
    ClientOnly: ClientOnlyStub,
    PageMetaHead: true,
  },
  mocks: { $t: (key: string) => key },
}

const baseProps = {
  apiBaseUrl: 'https://api.test',
  meta: {
    title: 'Subscriptions',
    robots: 'noindex, nofollow',
  } as SEOMeta,
}

describe('AccountSubscriptions page', () => {
  it('renders the subscription overview web component when an access token is present', () => {
    const wrapper = mount(AccountSubscriptions, {
      props: { ...baseProps, accessToken: 'token-123' },
      global: globalConfig,
    })

    const overview = wrapper.find('subscription-overview')
    expect(overview.exists()).toBe(true)
    // `customer-token` is the web component's own attribute name.
    expect(overview.attributes('customer-token')).toBe('token-123')
    expect(overview.attributes('base-url')).toBe('https://api.test')
    // Shop country id comes from shared props, not from a page prop.
    expect(overview.attributes('shop-id')).toBe('1001')
  })

  it('omits the overview web component when no access token is available', () => {
    const wrapper = mount(AccountSubscriptions, {
      props: baseProps,
      global: globalConfig,
    })

    expect(wrapper.find('subscription-overview').exists()).toBe(false)
    // Headline still renders regardless of token state.
    expect(
      wrapper.find('[data-testid="subscriptions-headline"]').exists(),
    ).toBe(true)
  })
})
