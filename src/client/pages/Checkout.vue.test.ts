import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { SEOMeta } from '@shared/types/SEO'
import type { Basket } from '@scayle/storefront/types'
import { createMockBasket } from '@test/mock-data/basket'
import Checkout from './Checkout.vue'

const mocks = vi.hoisted(() => ({
  apiInitialized: null as { value: boolean } | null,
  authApi: null as { value: unknown } | null,
  basket: null as { value: Basket | null | undefined } | null,
  reloadBasket: vi.fn(),
  trackBeginCheckout: vi.fn(),
  reload: vi.fn(),
  whenever: vi.fn(),
  forwardCheckoutTrackingMessage: vi.fn(),
  openConsentManager: vi.fn(),
  consentByVendor: {} as Record<string, boolean>,
  logError: vi.fn(),
  useCheckoutWebComponent: vi.fn(),
  // Captures the `message` listener registered via useEventListener so tests
  // can drive the postMessage handler directly.
  messageHandler: null as ((event: MessageEvent) => unknown) | null,
}))

vi.mock('@client/composables/useCheckoutWebComponent', async () => {
  const { ref } = await import('vue')
  mocks.apiInitialized = ref(true)
  mocks.authApi = ref(undefined)
  mocks.useCheckoutWebComponent.mockImplementation(() => ({
    apiInitialized: mocks.apiInitialized,
    authApi: mocks.authApi,
  }))
  return {
    useCheckoutWebComponent: mocks.useCheckoutWebComponent,
  }
})

vi.mock('@client/composables/useCheckoutWebComponentScript', () => ({
  useCheckoutWebComponentScript: () => undefined,
}))

vi.mock('@client/composables/useRoute', async () => {
  const { ref } = await import('vue')
  return {
    useRoute: () => ({
      query: ref(new URLSearchParams()),
      baseUrl: ref('https://shop.test'),
    }),
  }
})

vi.mock('@client/composables/useBasket', async () => {
  const { ref } = await import('vue')
  mocks.basket = ref(undefined)
  return {
    useBasket: () => ({
      basket: mocks.basket,
      reloadBasket: mocks.reloadBasket,
    }),
  }
})

vi.mock('@client/composables/tracking/useBasketEvents', () => ({
  useBasketEvents: () => ({ trackBeginCheckout: mocks.trackBeginCheckout }),
}))

vi.mock('@client/composables/tracking/useTracking', async () => {
  const { ref } = await import('vue')
  return {
    useTracking: () => ({ context: ref({ page_type: 'checkout' }) }),
  }
})
vi.mock('@client/composables/useConsent', async () => {
  const { computed } = await import('vue')
  return {
    useConsent: (vendor: string) => ({
      consent: computed(() => mocks.consentByVendor[vendor]),
    }),
  }
})
vi.mock('@client/composables/useConsentManager', () => ({
  useConsentManager: () => ({ openConsentManager: mocks.openConsentManager }),
}))
vi.mock('@client/composables/tracking/useCheckoutTracking', () => ({
  useCheckoutTracking: () => ({
    forwardCheckoutTrackingMessage: mocks.forwardCheckoutTrackingMessage,
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { reload: mocks.reload },
}))

vi.mock('@vueuse/core', async (importOriginal) => ({
  until: (await importOriginal<typeof import('@vueuse/core')>()).until,
  // `whenever` is only used to wire the auth-success reload. It defaults to a
  // no-op, which keeps the token-reload path out of the other tests; the tests
  // that cover that path give it an implementation that runs the callback.
  whenever: mocks.whenever,
  useEventListener: vi.fn(
    (_target: unknown, handler: (event: MessageEvent) => unknown) => {
      mocks.messageHandler = handler
    },
  ),
}))

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ error: mocks.logError }),
}))

const globalConfig = {
  stubs: { PageMetaHead: true },
  mocks: { $t: (key: string) => key },
}

const baseProps = {
  accessToken: 'test-token',
  checkoutJwt: 'test-jwt',
  meta: {
    title: 'Checkout',
    robots: 'noindex, nofollow',
  } as SEOMeta,
}

describe('Checkout page', () => {
  beforeEach(() => {
    mocks.reloadBasket.mockReset()
    mocks.reloadBasket.mockResolvedValue(undefined)
    mocks.reload.mockReset()
    mocks.whenever.mockReset()
    mocks.forwardCheckoutTrackingMessage.mockReset()
    mocks.messageHandler = null
    mocks.consentByVendor = {
      paypal: true,
      klarna: false,
      'scayle-analytics': true,
    }
    if (mocks.basket) {
      mocks.basket.value = undefined
    }
    if (mocks.apiInitialized) {
      mocks.apiInitialized.value = true
    }
    if (mocks.authApi) {
      mocks.authApi.value = undefined
    }
  })

  it('renders the checkout web component once the auth API is initialized', () => {
    const wrapper = mount(Checkout, { props: baseProps, global: globalConfig })

    expect(wrapper.find('scayle-checkout').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(true)
  })

  it('renders a visually hidden main heading while the auth API is not initialized', () => {
    mocks.apiInitialized!.value = false

    const wrapper = mount(Checkout, { props: baseProps, global: globalConfig })

    const heading = wrapper.get('h1')
    expect(heading.text()).toBe('checkout_page.meta.title')
    expect(heading.classes()).toContain('sr-only')
  })

  it.for([
    [
      { paypal: true, klarna: false, 'scayle-analytics': true },
      '{"paypal":true,"klarna":false,"scayleAnalytics":true}',
    ],
    [
      { paypal: false, klarna: true, 'scayle-analytics': false },
      '{"paypal":false,"klarna":true,"scayleAnalytics":false}',
    ],
  ] as const)(
    'binds the consent decision per vendor on the checkout web component',
    ([consentByVendor, expected]) => {
      mocks.consentByVendor = { ...consentByVendor }

      const wrapper = mount(Checkout, {
        props: baseProps,
        global: globalConfig,
      })

      expect(wrapper.get('scayle-checkout').attributes('consent')).toBe(
        expected,
      )
    },
  )

  it('binds the tracking context on the checkout web component', () => {
    const wrapper = mount(Checkout, { props: baseProps, global: globalConfig })

    expect(wrapper.get('scayle-checkout').attributes('tracking-context')).toBe(
      '{"page_type":"checkout"}',
    )
  })

  it('opens the consent manager when the web component reports missing consent', () => {
    const wrapper = mount(Checkout, { props: baseProps, global: globalConfig })
    wrapper
      .get('scayle-checkout')
      .element.dispatchEvent(new Event('consent-missing'))
    expect(mocks.openConsentManager).toHaveBeenCalledOnce()
  })

  it('does not render the checkout web component until the auth API is initialized', () => {
    mocks.apiInitialized!.value = false

    const wrapper = mount(Checkout, { props: baseProps, global: globalConfig })

    expect(wrapper.find('scayle-checkout').exists()).toBe(false)
  })

  /**
   * Mounts the page with the `auth:success` listener actually wired up and
   * returns the registered handler, so a test can drive a login.
   */
  function mountWithAuthSuccess() {
    const listeners = new Map<string, (payload?: unknown) => void>()
    mocks.authApi!.value = {
      events: {
        listen: (event: string, handler: (payload?: unknown) => void) =>
          listeners.set(event, handler),
        remove: vi.fn(),
      },
    }
    mocks.whenever.mockImplementation(
      (_source: unknown, callback: () => void) => callback(),
    )

    const wrapper = mount(Checkout, { props: baseProps, global: globalConfig })

    return { wrapper, authSuccess: listeners.get('auth:success')! }
  }

  it('unmounts the checkout web component while the post-login tokens reload', async () => {
    const { wrapper, authSuccess } = mountWithAuthSuccess()
    expect(authSuccess).toBeTypeOf('function')

    authSuccess()
    await flushPromises()

    // Signing in empties the basket the mounted component's JWT points at, so it
    // must not render until the JWT for the new basket key arrives.
    expect(wrapper.find('scayle-checkout').exists()).toBe(false)
    expect(mocks.reload).toHaveBeenCalledWith(
      expect.objectContaining({ only: ['accessToken', 'checkoutJwt'] }),
    )
  })

  it('remounts the checkout web component once the token reload finishes', async () => {
    const { wrapper, authSuccess } = mountWithAuthSuccess()

    authSuccess()
    await flushPromises()
    expect(wrapper.find('scayle-checkout').exists()).toBe(false)

    // `onFinish` also runs when another visit cancels this one, which is what
    // keeps a cancelled reload from leaving the page blank.
    mocks.reload.mock.calls[0]![0].onFinish()
    await flushPromises()

    expect(wrapper.find('scayle-checkout').exists()).toBe(true)
  })

  it('keeps the checkout web component unmounted while the token reload is in flight', async () => {
    const { wrapper, authSuccess } = mountWithAuthSuccess()

    authSuccess()
    await flushPromises()

    // `isReloadingTokens` only clears in `onFinish`. Until the reload lands,
    // the mounted component would render the emptied pre-login basket under
    // the old JWT, so the page stays empty instead.
    expect(wrapper.find('scayle-checkout').exists()).toBe(false)
  })

  it('logs the web component error payload without the checkout JWT', () => {
    const wrapper = mount(Checkout, { props: baseProps, global: globalConfig })

    wrapper
      .find('scayle-checkout')
      .element.dispatchEvent(
        new CustomEvent('error', { detail: { message: 'Payment failed' } }),
      )

    expect(mocks.logError).toHaveBeenCalledWith({
      message: 'onCheckoutError',
      payload: expect.objectContaining({
        detail: { message: 'Payment failed' },
      }),
    })
  })

  describe('begin_checkout', () => {
    it('tracks begin_checkout with the basket that is loaded at mount', async () => {
      const basket = createMockBasket()
      mocks.basket!.value = basket

      mount(Checkout, { props: baseProps, global: globalConfig })
      await flushPromises()

      expect(mocks.trackBeginCheckout).toHaveBeenCalledExactlyOnceWith(basket)
    })

    it('tracks begin_checkout once the deferred basket resolves after mount', async () => {
      mount(Checkout, { props: baseProps, global: globalConfig })
      expect(mocks.trackBeginCheckout).not.toHaveBeenCalled()

      const basket = createMockBasket()
      mocks.basket!.value = basket
      await flushPromises()

      expect(mocks.trackBeginCheckout).toHaveBeenCalledExactlyOnceWith(basket)
    })

    it('does not track begin_checkout when the basket fetch failed', async () => {
      mount(Checkout, { props: baseProps, global: globalConfig })

      mocks.basket!.value = null
      await flushPromises()

      expect(mocks.trackBeginCheckout).not.toHaveBeenCalled()
    })

    it('does not track begin_checkout again when the basket reloads', async () => {
      mocks.basket!.value = createMockBasket()
      mount(Checkout, { props: baseProps, global: globalConfig })
      await flushPromises()

      mocks.basket!.value = createMockBasket()
      await flushPromises()

      expect(mocks.trackBeginCheckout).toHaveBeenCalledTimes(1)
    })
  })

  it.for([
    {
      name: 'reloads the basket when the bridge forwards an add_to_cart event',
      result: { forwarded: true, eventName: 'add_to_cart' },
      expectedReloads: 1,
    },
    {
      name: 'reloads the basket when the bridge forwards a remove_from_cart event',
      result: { forwarded: true, eventName: 'remove_from_cart' },
      expectedReloads: 1,
    },
    {
      name: 'does not reload the basket for a forwarded checkout step',
      result: { forwarded: true, eventName: 'add_payment_info' },
      expectedReloads: 0,
    },
    {
      name: 'does not reload the basket for a message the bridge drops',
      result: { forwarded: false },
      expectedReloads: 0,
    },
  ])('$name', async ({ result, expectedReloads }) => {
    mocks.forwardCheckoutTrackingMessage.mockReturnValue(result)
    const basket = createMockBasket()
    mocks.basket!.value = basket

    mount(Checkout, { props: baseProps, global: globalConfig })
    expect(mocks.messageHandler).toBeTypeOf('function')

    const event = { data: { type: 'tracking' } } as MessageEvent
    await mocks.messageHandler!(event)
    await flushPromises()

    expect(mocks.forwardCheckoutTrackingMessage).toHaveBeenCalledWith(
      event,
      'https://shop.test',
      basket,
    )
    expect(mocks.reloadBasket).toHaveBeenCalledTimes(expectedReloads)
  })
})
