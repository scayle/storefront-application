import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, renderToString } from '@vue/test-utils'
import { nextTick } from 'vue'
import { EXPRESS_CHECKOUT_RESET_EVENT } from '@client/utils/expressCheckout'
import SFExpressCheckoutPDP from './SFExpressCheckoutPDP.vue'
import SFExpressCheckoutBase from './SFExpressCheckoutBase.vue'

const mocks = vi.hoisted(() => ({
  createOneTimeCheckoutToken: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    basket: { createOneTimeCheckoutToken: mocks.createOneTimeCheckoutToken },
  }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: mocks.showToast }),
}))

const stubs = {
  SFExpressCheckoutBase: {
    template: '<div />',
    // Declared so `props('jwt')` reads what the component passes; without them
    // the values land in `$attrs` and every `jwt` assertion reads `undefined`.
    props: ['accessToken', 'jwt', 'basketTotal'],
    emits: ['jwtMissing'],
  },
}

function makeWrapper(
  variantId?: number,
  quantity = 1,
  customData?: Record<string, unknown>,
) {
  return mount(SFExpressCheckoutPDP, {
    props: {
      variantId,
      quantity,
      customData,
    },
    global: { stubs },
  })
}

const emitJwtMissing = (wrapper: ReturnType<typeof makeWrapper>) =>
  wrapper.findComponent(SFExpressCheckoutBase).vm.$emit('jwtMissing')

describe('SFExpressCheckoutPDP', () => {
  beforeEach(() => {
    mocks.createOneTimeCheckoutToken.mockReset()
    mocks.createOneTimeCheckoutToken.mockResolvedValue({
      error: undefined,
      data: {
        checkoutJwt: 'jwt',
        finalPriceInCents: 100,
      },
    })
    mocks.showToast.mockReset()
  })

  it('renders on page load with no variant selected', () => {
    const wrapper = makeWrapper()

    expect(wrapper.findComponent(SFExpressCheckoutBase).exists()).toBe(true)
  })

  it('creates no token while no variant is selected', async () => {
    makeWrapper()
    await nextTick()

    expect(mocks.createOneTimeCheckoutToken).not.toHaveBeenCalled()
  })

  it('emits sizeMissing and creates no token when clicked without a size', async () => {
    const wrapper = makeWrapper()

    emitJwtMissing(wrapper)
    await nextTick()

    expect(wrapper.emitted('sizeMissing')).toHaveLength(1)
    expect(mocks.createOneTimeCheckoutToken).not.toHaveBeenCalled()
  })

  it('creates no token while rendering on the server for an already selected variant', async () => {
    await renderToString(SFExpressCheckoutPDP, {
      props: { variantId: 42, quantity: 1 },
      global: { stubs },
    })

    expect(mocks.createOneTimeCheckoutToken).not.toHaveBeenCalled()
  })

  it('prepares one token on mount for an already selected variant', async () => {
    const wrapper = makeWrapper(42)
    await nextTick()

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledExactlyOnceWith({
      variantId: 42,
      quantity: 1,
      customData: undefined,
    })
    expect(wrapper.emitted('sizeMissing')).toBeUndefined()
  })

  it('forwards customData when preparing a token on page load', async () => {
    const customData = { source: 'pdp-express' }
    makeWrapper(42, 1, customData)
    await nextTick()

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledWith({
      variantId: 42,
      quantity: 1,
      customData,
    })
  })

  it('creates a one-time checkout token when clicked with a size selected', async () => {
    const wrapper = makeWrapper(42)
    await nextTick()
    // Clear the token prepared on mount so the click has to create its own.
    document.dispatchEvent(new Event(EXPRESS_CHECKOUT_RESET_EVENT))
    mocks.createOneTimeCheckoutToken.mockClear()

    emitJwtMissing(wrapper)
    await nextTick()

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledWith({
      variantId: 42,
      quantity: 1,
      customData: undefined,
    })
    expect(wrapper.emitted('sizeMissing')).toBeUndefined()
  })

  it('prepares a token once a size is selected after the size gate', async () => {
    const wrapper = makeWrapper()

    emitJwtMissing(wrapper)
    await nextTick()
    await wrapper.setProps({ variantId: 7 })

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledWith({
      variantId: 7,
      quantity: 1,
      customData: undefined,
    })
  })

  it('prepares a token for a size picked without touching express checkout', async () => {
    const wrapper = makeWrapper()

    await wrapper.setProps({ variantId: 7 })

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledWith({
      variantId: 7,
      quantity: 1,
      customData: undefined,
    })
  })

  it('refreshes the token when the quantity changes', async () => {
    const wrapper = makeWrapper(42)
    await nextTick()

    await wrapper.setProps({ quantity: 3 })

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenLastCalledWith({
      variantId: 42,
      quantity: 3,
      customData: undefined,
    })
  })

  it('prepares a fresh token for a size selected after the flow is reset', async () => {
    const wrapper = makeWrapper()

    emitJwtMissing(wrapper)
    await nextTick()
    document.dispatchEvent(new Event(EXPRESS_CHECKOUT_RESET_EVENT))
    await nextTick()
    await wrapper.setProps({ variantId: 7 })

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledWith({
      variantId: 7,
      quantity: 1,
      customData: undefined,
    })
  })

  it('stays silent when a token prepared before the click fails', async () => {
    mocks.createOneTimeCheckoutToken.mockResolvedValue({
      error: new Error('boom'),
      data: undefined,
    })
    const dispatchSpy = vi.spyOn(document, 'dispatchEvent')
    makeWrapper(42)
    await nextTick()

    expect(mocks.showToast).not.toHaveBeenCalled()
    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('drops the previous token when a refreshed token fails', async () => {
    const wrapper = makeWrapper(42)
    await flushPromises()
    expect(wrapper.findComponent(SFExpressCheckoutBase).props('jwt')).toBe(
      'jwt',
    )
    mocks.createOneTimeCheckoutToken.mockResolvedValue({
      error: new Error('boom'),
      data: undefined,
    })

    await wrapper.setProps({ quantity: 3 })
    await nextTick()

    expect(
      wrapper.findComponent(SFExpressCheckoutBase).props('jwt'),
    ).toBeUndefined()
  })

  it('shows an error toast and resets when token creation fails on click', async () => {
    mocks.createOneTimeCheckoutToken.mockResolvedValue({
      error: new Error('boom'),
      data: undefined,
    })
    const wrapper = makeWrapper(42)
    await nextTick()
    const dispatchSpy = vi.spyOn(document, 'dispatchEvent')

    emitJwtMissing(wrapper)
    await nextTick()

    expect(mocks.showToast).toHaveBeenCalledWith(
      'expressCheckout.error.unknownError',
      { type: 'ERROR' },
    )
    expect(
      dispatchSpy.mock.calls.some(
        ([event]) =>
          event instanceof Event && event.type === EXPRESS_CHECKOUT_RESET_EVENT,
      ),
    ).toBe(true)
  })

  it('checks out with a retried token, not the late eager one, when express checkout is clicked during eager preparation', async () => {
    let resolveToken!: (value: {
      error: undefined
      data: { checkoutJwt: string; finalPriceInCents: number }
    }) => void
    mocks.createOneTimeCheckoutToken.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToken = resolve
        }),
    )
    const wrapper = makeWrapper(42)
    await nextTick()
    mocks.createOneTimeCheckoutToken.mockClear()

    emitJwtMissing(wrapper)
    await nextTick()

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledWith({
      variantId: 42,
      quantity: 1,
      customData: undefined,
    })

    resolveToken({
      error: undefined,
      data: { checkoutJwt: 'ignored-jwt', finalPriceInCents: 100 },
    })
    await flushPromises()

    expect(wrapper.findComponent(SFExpressCheckoutBase).props('jwt')).toBe(
      'jwt',
    )
  })

  it('starts fresh when remounted while a token request from the previous instance is in flight', async () => {
    let resolveFirstToken!: (value: {
      error: undefined
      data: { checkoutJwt: string; finalPriceInCents: number }
    }) => void
    mocks.createOneTimeCheckoutToken.mockReset()
    mocks.createOneTimeCheckoutToken
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstToken = resolve
          }),
      )
      .mockResolvedValue({
        error: undefined,
        data: { checkoutJwt: 'fresh-jwt', finalPriceInCents: 200 },
      })

    const first = makeWrapper(42)
    await nextTick()

    first.unmount()

    const second = makeWrapper(42)
    await flushPromises()

    resolveFirstToken({
      error: undefined,
      data: { checkoutJwt: 'stale-jwt', finalPriceInCents: 100 },
    })
    await flushPromises()

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledTimes(2)
    expect(mocks.showToast).not.toHaveBeenCalled()

    mocks.createOneTimeCheckoutToken.mockClear()
    emitJwtMissing(second)
    await nextTick()

    expect(mocks.createOneTimeCheckoutToken).toHaveBeenCalledWith({
      variantId: 42,
      quantity: 1,
      customData: undefined,
    })
  })

  it('drops an in-flight token response after the flow is reset', async () => {
    let resolveToken!: (value: {
      error: undefined
      data: { checkoutJwt: string; finalPriceInCents: number }
    }) => void
    mocks.createOneTimeCheckoutToken.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToken = resolve
        }),
    )
    const wrapper = makeWrapper()

    emitJwtMissing(wrapper)
    await nextTick()
    await wrapper.setProps({ variantId: 7 })
    await nextTick()

    document.dispatchEvent(new Event(EXPRESS_CHECKOUT_RESET_EVENT))
    await nextTick()
    resolveToken({
      error: undefined,
      data: { checkoutJwt: 'stale-jwt', finalPriceInCents: 100 },
    })
    await flushPromises()

    expect(
      wrapper.findComponent(SFExpressCheckoutBase).props('jwt'),
    ).toBeUndefined()
  })
})
