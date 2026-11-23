import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import SubscriptionCancellation from './SubscriptionCancellation.vue'

vi.mock('@client/composables/useSubscriptionWebComponentScript', () => ({
  useSubscriptionWebComponentScript: () => undefined,
}))

// The shop country id reaches the page through Inertia shared props, so the
// composable that reads them stands in for the shared-props payload here.
vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    // A real `ref` so the template unwraps it the way it unwraps the
    // composable's `computed`.
    config: ref({ country: { shopCountryId: 1001 } }),
  }),
}))

const ClientOnlyStub = defineComponent({
  name: 'ClientOnly',
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

const PageMetaHeadStub = defineComponent({
  name: 'PageMetaHead',
  props: { meta: { type: Object, required: true } },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'page-meta-head',
        'data-title': (props.meta as SEOMeta).title,
      })
  },
})

const globalConfig = {
  stubs: {
    ClientOnly: ClientOnlyStub,
    PageMetaHead: PageMetaHeadStub,
  },
  mocks: { $t: (key: string) => key },
}

const baseProps = {
  apiBaseUrl: 'https://api.test',
  meta: {
    title: 'Cancel subscription',
    robots: 'noindex, nofollow',
  } as SEOMeta,
}

describe('SubscriptionCancellation page', () => {
  it('renders a visually hidden main heading outside the web component', () => {
    const wrapper = mount(SubscriptionCancellation, {
      props: baseProps,
      global: globalConfig,
    })

    const heading = wrapper.get('h1')
    expect(heading.text()).toBe('subscription.cancellation.meta.title')
    expect(heading.classes()).toContain('sr-only')
    expect(wrapper.find('subscription-cancellation h1').exists()).toBe(false)
  })

  it('renders the cancellation web component with the shop config attributes', () => {
    const wrapper = mount(SubscriptionCancellation, {
      props: baseProps,
      global: globalConfig,
    })

    const cancellation = wrapper.find('subscription-cancellation')
    expect(cancellation.exists()).toBe(true)
    expect(cancellation.attributes('base-url')).toBe('https://api.test')
    // Shop country id comes from shared props, not from a page prop.
    expect(cancellation.attributes('shop-id')).toBe('1001')
  })
})
