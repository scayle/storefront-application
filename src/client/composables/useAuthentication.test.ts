import { CHECKOUT_AUTH_STORAGE_KEYS } from '@scayle/storefront/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'

import { useAuthentication } from './useAuthentication'

const navigateMock = vi.hoisted(() =>
  vi.fn((_url: string, options?: { onFinish?: () => void }) => {
    options?.onFinish?.()
  }),
)
const routerReloadMock = vi.hoisted(() =>
  vi.fn(({ onFinish }: { onFinish?: () => void }) => {
    onFinish?.()
  }),
)
// Inertia finishes a client-side visit only after its asynchronous history
// write, so the mock finishes on a later task too.
const routerReplaceMock = vi.hoisted(() =>
  vi.fn(({ onFinish }: { onFinish?: () => void }) => {
    setTimeout(() => onFinish?.())
  }),
)
const routerClearHistoryMock = vi.hoisted(() => vi.fn())
const logoutMock = vi.hoisted(() => vi.fn())
const toastShowMock = vi.hoisted(() => vi.fn())
const localStorageRemoveItemMock = vi.hoisted(() => vi.fn())
// The Storefront Application ships the list empty, so the tests that cover a
// shop's segment-dependent prop fill it.
const segmentDependentOnceProps = vi.hoisted((): string[] => [])

vi.mock('@shared/constants/segments', () => ({
  SEGMENT_DEPENDENT_ONCE_PROPS: segmentDependentOnceProps,
}))

vi.mock('@inertiajs/vue3', () => {
  return {
    router: {
      visit: navigateMock,
      reload: routerReloadMock,
      replace: routerReplaceMock,
      clearHistory: routerClearHistoryMock,
    },
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('./useToast', () => ({
  useToast: () => ({ show: toastShowMock }),
}))

vi.mock('./useRpcClient', () => ({
  useRpcClient: () => ({ auth: { logout: logoutMock } }),
}))

const isCheckoutPage = ref(false)
vi.mock('./usePageComponent', () => ({
  useIsPage: () => ({ isActive: isCheckoutPage }),
}))

vi.mock('./useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: ref({
      config: { countrySelector: 'path' },
      country: { path: 'de', isDefault: false },
    }),
    country: ref({ path: 'de', isDefault: false }),
  }),
}))

const queryRef = ref(new URLSearchParams())
vi.mock('./useRoute', () => ({
  useRoute: () => ({ query: queryRef, navigate: navigateMock }),
}))

const reloadedProps = ['customer', 'basket', 'wishlist', 'promotions']

describe('useAuthentication', () => {
  beforeEach(() => {
    logoutMock.mockReset()
    toastShowMock.mockReset()
    isCheckoutPage.value = false
    queryRef.value = new URLSearchParams()
    segmentDependentOnceProps.length = 0
  })

  it.for([
    ['login', 'authentication.notification.success.login'],
    ['register', 'authentication.notification.success.sign_up'],
    ['new-password', 'authentication.notification.success.reset_password'],
    ['login-guest', 'authentication.notification.success.guest_login'],
  ] as const)(
    'shows a success toast for the %s source',
    async ([event, messageKey]) => {
      const { authenticated } = useAuthentication()
      await authenticated(event)

      expect(toastShowMock).toHaveBeenCalledWith(messageKey, {
        type: 'SUCCESS',
      })
    },
  )

  it.for(['email-confirmation', 'init'] as const)(
    'shows no toast for the %s source',
    async (event) => {
      const { authenticated } = useAuthentication()
      await authenticated(event)

      expect(toastShowMock).not.toHaveBeenCalled()
    },
  )

  it('reloads the customer props on the checkout page', async () => {
    isCheckoutPage.value = true

    const { authenticated } = useAuthentication()
    await authenticated('login')

    expect(routerReloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        only: reloadedProps,
      }),
    )
  })

  // The checkout web component navigates after authentication itself, and an
  // Inertia visit would race with it.
  it('leaves the post-authentication flow to the checkout on the checkout page', async () => {
    isCheckoutPage.value = true
    queryRef.value = new URLSearchParams({ redirectUrl: '/account/orders' })

    const { authenticated } = useAuthentication()
    await authenticated('login')

    expect(navigateMock).not.toHaveBeenCalled()
    expect(toastShowMock).not.toHaveBeenCalled()
  })

  it('redirects to redirectUrl after authentication when present', async () => {
    queryRef.value = new URLSearchParams({
      redirectUrl: '/account/orders?page=2',
    })

    const { authenticated } = useAuthentication()
    await authenticated('login')

    expect(navigateMock).toHaveBeenCalledWith('/account/orders?page=2', {
      replace: true,
    })
  })

  it('decodes a percent-encoded redirectUrl from the sign-in query', async () => {
    queryRef.value = new URLSearchParams(
      // cspell:disable-next-line -- `%2Forders%3Fpage` tokenizes as "Forders", "Fpage"
      'redirectUrl=%2Faccount%2Forders%3Fpage%3D2',
    )

    const { authenticated } = useAuthentication()
    await authenticated('login')

    expect(navigateMock).toHaveBeenCalledWith('/account/orders?page=2', {
      replace: true,
    })
  })

  it('reloads the customer props after login', async () => {
    queryRef.value = new URLSearchParams()

    const { authenticated } = useAuthentication()
    await authenticated('login')

    expect(routerReloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        only: reloadedProps,
      }),
    )
  })

  it('reloads the segment-dependent once props with the customer props after login', async () => {
    segmentDependentOnceProps.push('navigation')

    const { authenticated } = useAuthentication()
    await authenticated('login')

    expect(routerReloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        only: [...reloadedProps, 'navigation'],
      }),
    )
  })

  // The same-origin check runs on the decoded value, so an attacker cannot
  // hide the target behind percent-encoding.
  it.for([
    { name: 'an absolute URL', query: 'redirectUrl=https://evil.example.com' },
    { name: 'a protocol-relative URL', query: 'redirectUrl=//evil.com' },
    {
      name: 'a percent-encoded protocol-relative URL',
      // cspell:disable-next-line -- `%2F%2Fevil` tokenizes as "Fevil"
      query: 'redirectUrl=%2F%2Fevil.com',
    },
    {
      name: 'a percent-encoded absolute URL',
      // cspell:disable-next-line -- `%3A%2F%2Fevil` tokenizes as "Fevil"
      query: 'redirectUrl=https%3A%2F%2Fevil.example.com',
    },
  ])('falls back to home when redirectUrl is $name', async ({ query }) => {
    queryRef.value = new URLSearchParams(query)

    const { authenticated } = useAuthentication()
    await authenticated('login')

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
  })

  describe('logout', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {
        localStorage: { removeItem: localStorageRemoveItemMock },
      })
    })

    it('clears checkout auth localStorage keys and logs out', async () => {
      logoutMock.mockResolvedValueOnce(createSafeSuccess(undefined))
      const { logout } = useAuthentication()
      expect(await logout()).toBe(true)

      expect(logoutMock).toHaveBeenCalledTimes(1)
      for (const key of CHECKOUT_AUTH_STORAGE_KEYS) {
        expect(localStorageRemoveItemMock).toHaveBeenCalledWith(key)
      }
    })

    it('reloads the whole current page in place after a successful logout', async () => {
      logoutMock.mockResolvedValueOnce(createSafeSuccess(undefined))
      const { logout } = useAuthentication()
      await logout()

      expect(routerReloadMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ replace: true }),
      )
      expect(routerReloadMock.mock.calls[0]![0]).not.toHaveProperty('only')
      expect(navigateMock).not.toHaveBeenCalled()
    })

    // The client keeps once props across visits, so the full reload would
    // leave the customer's segment-specific value in place.
    it('reloads the segment-dependent once props after the page reload', async () => {
      segmentDependentOnceProps.push('navigation')
      logoutMock.mockResolvedValueOnce(createSafeSuccess(undefined))
      const { logout } = useAuthentication()
      await logout()

      expect(routerReloadMock).toHaveBeenCalledTimes(2)
      expect(routerReloadMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ only: ['navigation'] }),
      )
    })

    // Inertia reads an empty `only` as a reload of every prop.
    it('sends no second reload when no once prop depends on segments', async () => {
      logoutMock.mockResolvedValueOnce(createSafeSuccess(undefined))
      const { logout } = useAuthentication()
      await logout()

      expect(routerReloadMock).toHaveBeenCalledTimes(1)
    })

    // Inertia leaves an unset once prop out of `X-Inertia-Except-Once-Props`,
    // so the reload resolves it for the logged-out session.
    it('removes the session props and keeps every other prop', async () => {
      logoutMock.mockResolvedValueOnce(createSafeSuccess(undefined))
      const { logout } = useAuthentication()
      await logout()

      const [{ props }] = routerReplaceMock.mock.calls[0] as unknown as [
        { props: (props: Record<string, unknown>) => Record<string, unknown> },
      ]
      expect(
        props({
          customer: { id: 1 },
          basket: { items: [] },
          wishlist: { items: [] },
          promotions: [],
          navigation: [],
        }),
      ).toEqual({
        customer: undefined,
        basket: undefined,
        wishlist: undefined,
        promotions: undefined,
        navigation: [],
      })
    })

    it('shows an error toast and still clears checkout auth localStorage keys on failure', async () => {
      const error = new Error('network down')
      logoutMock.mockResolvedValueOnce(createSafeFailure(error))

      const { logout } = useAuthentication()
      expect(await logout()).toBe(false)

      expect(toastShowMock).toHaveBeenCalledWith(
        'authentication.notification.error.logout',
        { type: 'ERROR' },
      )
      for (const key of CHECKOUT_AUTH_STORAGE_KEYS) {
        expect(localStorageRemoveItemMock).toHaveBeenCalledWith(key)
      }
      expect(routerReplaceMock).not.toHaveBeenCalled()
      expect(routerReloadMock).not.toHaveBeenCalled()
      expect(navigateMock).not.toHaveBeenCalled()
    })

    // Unsetting the props rewrites the current entry with this page's customer
    // data, which needs the old key. The reload writes only logged-out data.
    it('clears the history once the session props are removed and before the reload', async () => {
      logoutMock.mockResolvedValueOnce(createSafeSuccess(undefined))
      const events: string[] = []
      routerReplaceMock.mockImplementationOnce(({ onFinish }) => {
        setTimeout(() => {
          events.push('props removed')
          onFinish?.()
        })
      })
      routerClearHistoryMock.mockImplementationOnce(() => {
        events.push('history cleared')
      })
      routerReloadMock.mockImplementationOnce(({ onFinish }) => {
        events.push('page reloaded')
        onFinish?.()
      })

      const { logout } = useAuthentication()
      await logout()

      expect(events).toEqual([
        'props removed',
        'history cleared',
        'page reloaded',
      ])
    })

    // A customer whose logout failed is still signed in, so their history
    // stays readable.
    it('keeps the history when the logout fails', async () => {
      logoutMock.mockResolvedValueOnce(createSafeFailure(new Error('down')))
      const { logout } = useAuthentication()
      await logout()

      expect(routerClearHistoryMock).not.toHaveBeenCalled()
    })
  })
})
