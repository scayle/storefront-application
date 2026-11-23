import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { EXPRESS_CHECKOUT_RESET_EVENT } from '@client/utils/expressCheckout'
import { routes } from '@shared/routes'
import SFExpressCheckoutBase from './SFExpressCheckoutBase.vue'

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  navigate: vi.fn(),
  openConsentManager: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  apiInitialized: true,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: mocks.showToast }),
}))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({ navigate: mocks.navigate }),
}))

vi.mock('@client/composables/useConsentManager', () => ({
  useConsentManager: () => ({ openConsentManager: mocks.openConsentManager }),
}))

vi.mock('@client/composables/useConsent', () => ({
  useConsent: () => ({ consent: computed(() => true) }),
}))

vi.mock('@client/composables/useCheckoutWebComponentScript', () => ({
  useCheckoutWebComponentScript: () => undefined,
}))

vi.mock('@client/composables/useCheckoutWebComponent', () => ({
  useCheckoutWebComponent: () => ({
    apiInitialized: ref(mocks.apiInitialized),
  }),
}))

vi.mock('@scayle/storefront/shared', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@scayle/storefront/shared')>()
  return {
    ...actual,
    createLogger: () => ({ error: mocks.logError, debug: mocks.logDebug }),
  }
})

const mountBase = () =>
  mount(SFExpressCheckoutBase, {
    props: { accessToken: 'token', jwt: 'jwt', basketTotal: 100 },
  })

const webComponent = (wrapper: ReturnType<typeof mountBase>) =>
  wrapper.get('scayle-express-checkout')

const emitError = async (
  wrapper: ReturnType<typeof mountBase>,
  detail: unknown,
) => {
  const event = new CustomEvent('express-error', { detail })
  webComponent(wrapper).element.dispatchEvent(event)
  await wrapper.vm.$nextTick()
}

const apiError = (errorKey: string) => ({
  url: '/x',
  statusCode: 400,
  errorKey,
  message: 'failed',
})

/**
 * Distinct reset events dispatched on `document`. happy-dom routes one
 * dispatch through the spy once per propagation phase, so count event
 * instances rather than calls.
 */
const resetEvents = () =>
  new Set(
    vi
      .mocked(document.dispatchEvent)
      .mock.calls.map(([event]) => event)
      .filter((event) => event.type === EXPRESS_CHECKOUT_RESET_EVENT),
  )

describe('SFExpressCheckoutBase', () => {
  beforeEach(() => {
    vi.spyOn(document, 'dispatchEvent')
  })

  afterEach(() => {
    mocks.showToast.mockReset()
    mocks.navigate.mockReset()
    mocks.logError.mockReset()
    mocks.logDebug.mockReset()
    mocks.apiInitialized = true
  })

  it('reserves space for express checkout methods before the checkout API is initialized', () => {
    mocks.apiInitialized = false
    const wrapper = mountBase()

    expect(wrapper.find('[data-testid="express-checkout"]').exists()).toBe(true)
    expect(wrapper.find('scayle-express-checkout').exists()).toBe(false)
  })

  it('renders the web component inside the reserved space once the checkout API is initialized', () => {
    const wrapper = mountBase()

    expect(
      wrapper
        .get('[data-testid="express-checkout"]')
        .find('scayle-express-checkout')
        .exists(),
    ).toBe(true)
  })

  it('renders neither the reserved space nor the web component while not visible', async () => {
    const wrapper = mountBase()

    await wrapper.setProps({ visible: false })

    expect(wrapper.find('[data-testid="express-checkout"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('scayle-express-checkout').exists()).toBe(false)
  })

  describe('onExpressError', () => {
    it.each([
      ['device_not_supported', 'deviceNotSupported'],
      ['payment_method_not_available', 'paymentMethodNotAvailable'],
      ['psp_session_creation_failed', 'pspSessionCreationFailed'],
      ['failed_to_fetch_session', 'failedToFetchSession'],
      ['basket_not_found', 'basketNotFound'],
      ['basket_invalid', 'basketInvalid'],
      [
        'error_shipping_address_validation_failed',
        'errorShippingAddressValidationFailed',
      ],
      ['failed_dependency', 'failedDependency'],
    ])('maps errorKey %s to its toast message', async (errorKey, i18nKey) => {
      const wrapper = mountBase()

      await emitError(wrapper, apiError(errorKey))

      expect(mocks.showToast).toHaveBeenCalledWith(
        `expressCheckout.error.${i18nKey}`,
        { type: 'ERROR' },
      )
      expect(resetEvents().size).toBe(1)
      expect(mocks.logError).toHaveBeenCalledTimes(1)
    })

    it.for([
      { case: 'an unrecognized errorKey', detail: apiError('something_new') },
      {
        case: 'an SDK error without errorKey',
        detail: { message: 'sdk', paymentKey: 'paypal', provider: 'paypal' },
      },
      { case: 'a detail that is not an object', detail: 'boom' },
    ])('falls back to the unknown error for $case', async ({ detail }) => {
      const wrapper = mountBase()

      await emitError(wrapper, detail)

      expect(mocks.showToast).toHaveBeenCalledWith(
        'expressCheckout.error.unknownError',
        { type: 'ERROR' },
      )
      expect(resetEvents().size).toBe(1)
    })

    it.for([
      {
        shape: 'an API error',
        detail: {
          url: 'https://checkout.test/baskets/guest-basket-key',
          statusCode: 400,
          errorKey: 'basket_invalid',
          message: 'Basket is invalid',
        },
        expected: {
          statusCode: 400,
          errorKey: 'basket_invalid',
          message: 'Basket is invalid',
        },
      },
      {
        shape: 'an SDK error',
        detail: { message: 'sdk', paymentKey: 'paypal', provider: 'paypal' },
        expected: { message: 'sdk', paymentKey: 'paypal', provider: 'paypal' },
      },
    ])(
      'logs the fields of $shape without the request url',
      async ({ detail, expected }) => {
        const wrapper = mountBase()

        await emitError(wrapper, detail)

        expect(mocks.logError).toHaveBeenCalledWith({
          message: 'Express checkout error',
          detail: expected,
        })
        expect(JSON.stringify(mocks.logError.mock.calls)).not.toContain(
          'guest-basket-key',
        )
      },
    )
  })

  it('shows the out-of-constraints toast and resets the button', async () => {
    const wrapper = mountBase()

    webComponent(wrapper).element.dispatchEvent(new Event('out-of-constraints'))
    await wrapper.vm.$nextTick()

    expect(mocks.showToast).toHaveBeenCalledWith(
      'expressCheckout.error.outOfConstraints',
      { type: 'ERROR' },
    )
    expect(resetEvents().size).toBe(1)
  })

  describe('onExpressCheckoutFinished', () => {
    it('navigates to checkout with the transaction id', async () => {
      const wrapper = mountBase()

      webComponent(wrapper).element.dispatchEvent(
        new CustomEvent('express-checkout-finished', {
          detail: { isFinalized: false, orderId: 1, id: 'tx-1' },
        }),
      )
      await wrapper.vm.$nextTick()

      expect(mocks.navigate).toHaveBeenCalledWith(
        `${routes.checkout}?transactionId=tx-1`,
      )
    })

    it('returns early without navigating when the order is already finalized', async () => {
      const wrapper = mountBase()

      webComponent(wrapper).element.dispatchEvent(
        new CustomEvent('express-checkout-finished', {
          detail: { isFinalized: true, orderId: 1, id: 'tx-1' },
        }),
      )
      await wrapper.vm.$nextTick()

      expect(mocks.navigate).not.toHaveBeenCalled()
      expect(mocks.logDebug).toHaveBeenCalledTimes(1)
    })
  })

  it('emits jwtMissing when the web component reports a missing jwt', async () => {
    const wrapper = mountBase()

    webComponent(wrapper).element.dispatchEvent(new Event('jwt-missing'))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('jwtMissing')).toHaveLength(1)
  })

  it('opens the consent manager when the web component reports missing consent', async () => {
    const wrapper = mountBase()

    webComponent(wrapper).element.dispatchEvent(new Event('consent-missing'))
    await wrapper.vm.$nextTick()

    expect(mocks.openConsentManager).toHaveBeenCalledTimes(1)
  })
})
