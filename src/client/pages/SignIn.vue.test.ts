import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import SignIn from './SignIn.vue'

const mocks = vi.hoisted(() => ({
  apiInitialized: null as Ref<boolean> | null,
  query: null as Ref<URLSearchParams> | null,
  forwardCheckoutTrackingMessage: vi.fn(),
  useCheckoutWebComponent: vi.fn(),
  messageHandler: null as ((event: MessageEvent) => unknown) | null,
}))

vi.mock('@client/composables/useCheckoutWebComponent', () => {
  mocks.apiInitialized = ref(true)
  mocks.useCheckoutWebComponent.mockImplementation(() => ({
    apiInitialized: mocks.apiInitialized,
  }))
  return {
    useCheckoutWebComponent: mocks.useCheckoutWebComponent,
  }
})

vi.mock('@client/composables/useCheckoutWebComponentScript', () => ({
  useCheckoutWebComponentScript: () => undefined,
}))

vi.mock('@client/composables/tracking/useCheckoutTracking', () => ({
  useCheckoutTracking: () => ({
    forwardCheckoutTrackingMessage: mocks.forwardCheckoutTrackingMessage,
  }),
}))

vi.mock('@client/composables/tracking/useTracking', () => ({
  useTracking: () => ({ context: ref({ page_type: 'sign_in' }) }),
}))
vi.mock('@client/composables/useRoute', () => {
  mocks.query = ref(new URLSearchParams())
  return {
    useRoute: () => ({ query: mocks.query, baseUrl: ref('https://shop.test') }),
  }
})

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: ref({
      config: { countrySelector: 'path' },
      country: { path: 'de' },
    }),
  }),
}))

vi.mock('@vueuse/core', () => ({
  useEventListener: vi.fn(
    (_target: unknown, handler: (event: MessageEvent) => unknown) => {
      mocks.messageHandler = handler
    },
  ),
}))

const globalConfig = {
  stubs: { PageMetaHead: true },
  mocks: { $t: (key: string) => key },
}

const baseProps = {
  meta: {
    title: 'Sign in',
    robots: 'noindex, nofollow',
  } as SEOMeta,
}

describe('SignIn page', () => {
  beforeEach(() => {
    mocks.apiInitialized!.value = true
    mocks.query!.value = new URLSearchParams()
    mocks.forwardCheckoutTrackingMessage.mockClear()
    mocks.messageHandler = null
  })

  it('renders the login auth web component when the api is initialized', () => {
    const wrapper = mount(SignIn, { props: baseProps, global: globalConfig })

    const auth = wrapper.find('scayle-auth')
    expect(auth.exists()).toBe(true)
    expect(auth.attributes('variant')).toBe('login')
    expect(wrapper.find('scayle-auth-new-password').exists()).toBe(false)
  })

  it('binds the tracking context on the auth web component', () => {
    const wrapper = mount(SignIn, { props: baseProps, global: globalConfig })
    expect(wrapper.get('scayle-auth').attributes('tracking-context')).toBe(
      '{"page_type":"sign_in"}',
    )
  })

  it('renders neither auth web component before the auth API is initialized', () => {
    mocks.apiInitialized!.value = false

    const wrapper = mount(SignIn, { props: baseProps, global: globalConfig })

    expect(wrapper.find('scayle-auth').exists()).toBe(false)
    expect(wrapper.find('scayle-auth-new-password').exists()).toBe(false)
  })

  it('points the reset e-mail at the localized sign-in route', () => {
    const wrapper = mount(SignIn, { props: baseProps, global: globalConfig })

    // `{hash}` is a placeholder the Authentication API substitutes.
    expect(wrapper.find('scayle-auth').attributes('pw-reset-url')).toBe(
      'https://shop.test/de/signin?hash={hash}',
    )
  })

  it('renders the register variant when showRegistration is set', () => {
    const wrapper = mount(SignIn, {
      props: { ...baseProps, showRegistration: true },
      global: globalConfig,
    })

    expect(wrapper.find('scayle-auth').attributes('variant')).toBe('register')
  })

  it('renders the new-password web component for a reset link', () => {
    // The reset e-mail links to `/signin?hash=<hash>`.
    mocks.query!.value = new URLSearchParams({ hash: 'reset-hash' })

    const wrapper = mount(SignIn, { props: baseProps, global: globalConfig })

    expect(wrapper.find('scayle-auth-new-password').exists()).toBe(true)
    expect(wrapper.find('scayle-auth').exists()).toBe(false)
  })

  it('forwards tracking events posted by the auth web component', () => {
    mount(SignIn, { props: baseProps, global: globalConfig })
    expect(mocks.messageHandler).toBeTypeOf('function')

    const event = { data: { type: 'tracking' } } as MessageEvent
    mocks.messageHandler!(event)

    expect(mocks.forwardCheckoutTrackingMessage).toHaveBeenCalledWith(
      event,
      'https://shop.test',
      undefined,
    )
  })
})
