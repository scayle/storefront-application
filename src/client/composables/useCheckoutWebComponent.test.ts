import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, isReadonly } from 'vue'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'

const {
  mockUseEventListener,
  mockGetCheckoutAuthApi,
  mockClearCheckoutAuthStorage,
  mockAuthenticated,
  mockExchangeAuthCode,
  mockRefreshAccessToken,
  mockLogError,
  mockTrackAuthSuccess,
} = vi.hoisted(() => ({
  mockUseEventListener: vi.fn(),
  mockGetCheckoutAuthApi: vi.fn(),
  mockClearCheckoutAuthStorage: vi.fn(),
  mockAuthenticated: vi.fn(),
  mockExchangeAuthCode: vi.fn(),
  mockRefreshAccessToken: vi.fn(),
  mockLogError: vi.fn(),
  mockTrackAuthSuccess: vi.fn(),
}))

// The configured OAuth client id, which the missing-id case clears.
const configState = vi.hoisted(() => ({
  clientId: '42' as string | undefined,
}))

vi.mock('@vueuse/core', () => ({
  useEventListener: mockUseEventListener,
}))

vi.mock('@scayle/storefront/client', () => ({
  getCheckoutAuthApi: mockGetCheckoutAuthApi,
  clearCheckoutAuthStorage: mockClearCheckoutAuthStorage,
}))

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: mockLogError,
  }),
}))

vi.mock('./useAuthentication', () => ({
  useAuthentication: () => ({ authenticated: mockAuthenticated }),
}))

vi.mock('./tracking/useAuthEvents', () => ({
  useAuthEvents: () => ({ trackAuthSuccess: mockTrackAuthSuccess }),
}))

vi.mock('./useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: computed(() => ({
      config: {
        oauth:
          configState.clientId === undefined
            ? undefined
            : { clientId: configState.clientId },
      },
    })),
  }),
}))

vi.mock('./useRpcClient', () => ({
  useRpcClient: () => ({
    auth: {
      exchangeAuthCode: mockExchangeAuthCode,
      refreshAccessToken: mockRefreshAccessToken,
    },
  }),
}))

describe('useCheckoutWebComponent', () => {
  async function loadComposable() {
    const { useCheckoutWebComponent } =
      await import('./useCheckoutWebComponent')
    return useCheckoutWebComponent
  }

  function getReadyHandler() {
    const readyCall = mockUseEventListener.mock.calls.find(
      ([event]) => event === 'scayle.auth.ready',
    )
    expect(readyCall).toBeDefined()
    return readyCall![1] as () => void | Promise<void>
  }

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('SSR', false)
    configState.clientId = '42'
  })

  it('initializes the auth API on scayle.auth.ready and exposes it via authApi', async () => {
    const authApi = {
      init: vi.fn().mockResolvedValue(false),
      events: { listen: vi.fn() },
    }
    mockGetCheckoutAuthApi.mockReturnValue(authApi)

    const useCheckoutWebComponent = await loadComposable()
    const { apiInitialized, authApi: authApiRef } =
      useCheckoutWebComponent('existing-token')

    expect(apiInitialized.value).toBe(false)
    expect(authApiRef.value).toBeUndefined()

    await getReadyHandler()()

    expect(mockClearCheckoutAuthStorage).toHaveBeenCalledTimes(1)
    expect(authApi.init).toHaveBeenCalledWith({
      clientId: 42,
      accessToken: 'existing-token',
      hooks: {
        exchangeAuthCodeHook: expect.any(Function),
        refreshTokenHook: expect.any(Function),
      },
    })
    expect(apiInitialized.value).toBe(true)
    expect(authApiRef.value).toBe(authApi)
  })

  it('returns apiInitialized read-only, so only the ready listener sets it', async () => {
    const useCheckoutWebComponent = await loadComposable()
    const { apiInitialized } = useCheckoutWebComponent(undefined)

    expect(isReadonly(apiInitialized)).toBe(true)
  })

  it('does not initialize during a server render', async () => {
    vi.stubEnv('SSR', true)
    const authApi = {
      init: vi.fn().mockResolvedValue(false),
      events: { listen: vi.fn() },
    }
    mockGetCheckoutAuthApi.mockReturnValue(authApi)

    const useCheckoutWebComponent = await loadComposable()
    const { apiInitialized } = useCheckoutWebComponent(undefined)

    await getReadyHandler()()

    expect(authApi.init).not.toHaveBeenCalled()
    expect(apiInitialized.value).toBe(false)
  })

  it('does not initialize when getCheckoutAuthApi returns undefined', async () => {
    mockGetCheckoutAuthApi.mockReturnValue(undefined)

    const useCheckoutWebComponent = await loadComposable()
    const { apiInitialized } = useCheckoutWebComponent(undefined)

    await getReadyHandler()()

    expect(mockClearCheckoutAuthStorage).not.toHaveBeenCalled()
    expect(apiInitialized.value).toBe(false)
  })

  it('skips re-initialization when the auth API is already initialized', async () => {
    const authApi = {
      init: vi.fn().mockResolvedValue(true),
      events: { listen: vi.fn() },
    }
    mockGetCheckoutAuthApi.mockReturnValue(authApi)

    const useCheckoutWebComponent = await loadComposable()
    const { apiInitialized } = useCheckoutWebComponent(undefined)

    await getReadyHandler()()
    expect(apiInitialized.value).toBe(true)
    expect(authApi.init).toHaveBeenCalledTimes(1)

    await getReadyHandler()()
    expect(authApi.init).toHaveBeenCalledTimes(1)
  })

  it('tracks non-init auth:success events once authenticated has refreshed the session props', async () => {
    const listenHandlers = new Map<
      string,
      (payload: unknown) => void | Promise<void>
    >()
    const authApi = {
      init: vi.fn().mockResolvedValue(false),
      events: {
        listen: vi.fn(
          (
            event: string,
            handler: (payload: unknown) => void | Promise<void>,
          ) => {
            listenHandlers.set(event, handler)
          },
        ),
      },
    }
    mockGetCheckoutAuthApi.mockReturnValue(authApi)
    const { promise: refreshed, resolve: finishRefresh } =
      Promise.withResolvers<void>()
    mockAuthenticated.mockReturnValue(refreshed)

    const useCheckoutWebComponent = await loadComposable()
    useCheckoutWebComponent(undefined)

    await getReadyHandler()()

    await listenHandlers.get('auth:success')!({ source: 'init' })
    expect(mockAuthenticated).not.toHaveBeenCalled()
    expect(mockTrackAuthSuccess).not.toHaveBeenCalled()

    listenHandlers.get('auth:success')!({ source: 'login' })
    expect(mockAuthenticated).toHaveBeenCalledExactlyOnceWith('login')
    // Until the `customer` refresh lands, the event would carry the context of
    // the session before sign-in.
    expect(mockTrackAuthSuccess).not.toHaveBeenCalled()

    finishRefresh()
    await refreshed
    expect(mockTrackAuthSuccess).toHaveBeenCalledExactlyOnceWith('login')
  })

  async function getAuthHooks() {
    const authApi = {
      init: vi.fn().mockResolvedValue(false),
      events: { listen: vi.fn() },
    }
    mockGetCheckoutAuthApi.mockReturnValue(authApi)

    const useCheckoutWebComponent = await loadComposable()
    useCheckoutWebComponent(undefined)

    await getReadyHandler()()

    return authApi.init.mock.calls[0]![0].hooks as {
      exchangeAuthCodeHook: (input: { authCode: string }) => Promise<{
        accessToken: string
      }>
      refreshTokenHook: (
        code: { authorizationCode: string } | Record<string, never>,
      ) => Promise<{ accessToken: string }>
    }
  }

  type AuthHooks = Awaited<ReturnType<typeof getAuthHooks>>

  // The four RPC outcomes cover both hooks: the exchange hook and the refresh
  // hook with an authorization code share the exchange branch, and the refresh
  // hook without one shares the refresh branch.
  it.for([
    {
      name: 'exchangeAuthCodeHook rejects when the exchange RPC fails',
      stub: () =>
        mockExchangeAuthCode.mockResolvedValue(
          createSafeFailure(new Error('exchange failed')),
        ),
      call: (hooks: AuthHooks) =>
        hooks.exchangeAuthCodeHook({ authCode: 'auth-code' }),
      rejects: 'Unable to get access token',
    },
    {
      name: 'exchangeAuthCodeHook rejects when the exchange RPC returns no access token',
      stub: () => mockExchangeAuthCode.mockResolvedValue(createSafeSuccess({})),
      call: (hooks: AuthHooks) =>
        hooks.exchangeAuthCodeHook({ authCode: 'auth-code' }),
      rejects: 'Unable to get access token',
    },
    {
      name: 'refreshTokenHook rejects when the refresh RPC fails',
      stub: () =>
        mockRefreshAccessToken.mockResolvedValue(
          createSafeFailure(new Error('refresh failed')),
        ),
      call: (hooks: AuthHooks) => hooks.refreshTokenHook({}),
      rejects: 'Unable to get access token',
    },
    {
      name: 'refreshTokenHook rejects when the exchange RPC behind an authorization code fails',
      stub: () =>
        mockExchangeAuthCode.mockResolvedValue(
          createSafeFailure(new Error('exchange failed')),
        ),
      call: (hooks: AuthHooks) =>
        hooks.refreshTokenHook({ authorizationCode: 'auth-code' }),
      rejects: 'Unable to get access token',
      exchangeInput: { code: 'auth-code' },
    },
    {
      name: 'exchangeAuthCodeHook rejects on a typed exchange error other than ALREADY_SIGNED_IN',
      stub: () =>
        mockExchangeAuthCode.mockResolvedValue(
          createSafeFailure({ code: 'INTERNAL_SERVER_ERROR' }, true),
        ),
      call: (hooks: AuthHooks) =>
        hooks.exchangeAuthCodeHook({ authCode: 'auth-code' }),
      rejects: 'Unable to get access token',
      exchangeInput: { code: 'auth-code' },
    },
    {
      name: 'exchangeAuthCodeHook resolves with the token the exchange RPC returned',
      stub: () =>
        mockExchangeAuthCode.mockResolvedValue(
          createSafeSuccess({ accessToken: 'exchanged-token' }),
        ),
      call: (hooks: AuthHooks) =>
        hooks.exchangeAuthCodeHook({ authCode: 'auth-code' }),
      token: { accessToken: 'exchanged-token' },
      exchangeInput: { code: 'auth-code' },
    },
    {
      name: 'refreshTokenHook resolves with the token exchanged from the authorization code',
      stub: () =>
        mockExchangeAuthCode.mockResolvedValue(
          createSafeSuccess({ accessToken: 'exchanged-token' }),
        ),
      call: (hooks: AuthHooks) =>
        hooks.refreshTokenHook({ authorizationCode: 'auth-code' }),
      token: { accessToken: 'exchanged-token' },
      exchangeInput: { code: 'auth-code' },
    },
  ])('$name', async ({ stub, call, rejects, token, exchangeInput }) => {
    stub()
    const hooks = await getAuthHooks()

    const result = call(hooks)

    if (rejects) {
      await expect(result).rejects.toThrow(rejects)
    } else {
      await expect(result).resolves.toEqual(token)
    }
    // A refresh hook carrying an authorization code exchanges it and never
    // touches the refresh RPC.
    if (exchangeInput) {
      expect(mockExchangeAuthCode).toHaveBeenCalledWith(exchangeInput)
      expect(mockRefreshAccessToken).not.toHaveBeenCalled()
    }
  })

  describe('when another tab already signed the session in', () => {
    // Both hooks exchange an authorization code, so both reach this branch.
    const callers = [
      {
        hook: 'exchangeAuthCodeHook',
        call: (hooks: AuthHooks) =>
          hooks.exchangeAuthCodeHook({ authCode: 'auth-code' }),
      },
      {
        hook: 'refreshTokenHook',
        call: (hooks: AuthHooks) =>
          hooks.refreshTokenHook({ authorizationCode: 'auth-code' }),
      },
    ]

    beforeEach(() => {
      mockExchangeAuthCode.mockResolvedValue(
        createSafeFailure({ code: 'ALREADY_SIGNED_IN' }, true),
      )
    })

    it.for(callers)(
      '$hook resolves with the access token of the current session',
      async ({ call }) => {
        mockRefreshAccessToken.mockResolvedValue(
          createSafeSuccess({ accessToken: 'current-token' }),
        )
        const hooks = await getAuthHooks()

        await expect(call(hooks)).resolves.toEqual({
          accessToken: 'current-token',
        })
        expect(mockExchangeAuthCode).toHaveBeenCalledWith({
          code: 'auth-code',
        })
        expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1)
      },
    )

    it.for(callers)(
      '$hook rejects when the refresh fails too',
      async ({ call }) => {
        mockRefreshAccessToken.mockResolvedValue(
          createSafeFailure(new Error('refresh failed')),
        )
        const hooks = await getAuthHooks()

        await expect(call(hooks)).rejects.toThrow('Unable to get access token')
      },
    )
  })

  it('refreshTokenHook refreshes the access token when no authorization code is given', async () => {
    mockRefreshAccessToken.mockResolvedValue(
      createSafeSuccess({ accessToken: 'refreshed-token' }),
    )

    const hooks = await getAuthHooks()

    await expect(hooks.refreshTokenHook({})).resolves.toEqual({
      accessToken: 'refreshed-token',
    })
    expect(mockExchangeAuthCode).not.toHaveBeenCalled()
  })

  it('refreshTokenHook falls back to a refresh when the authorization code is empty', async () => {
    mockRefreshAccessToken.mockResolvedValue(
      createSafeSuccess({ accessToken: 'refreshed-token' }),
    )

    const hooks = await getAuthHooks()

    await expect(
      hooks.refreshTokenHook({ authorizationCode: '' }),
    ).resolves.toEqual({ accessToken: 'refreshed-token' })
    expect(mockExchangeAuthCode).not.toHaveBeenCalled()
  })

  it.for([
    { name: 'is not configured', clientId: undefined as string | undefined },
    { name: 'is empty', clientId: '' },
  ])(
    'logs and aborts initialization when the OAuth client id $name',
    async ({ clientId }) => {
      configState.clientId = clientId
      const authApi = {
        init: vi.fn().mockResolvedValue(false),
        events: { listen: vi.fn() },
      }
      mockGetCheckoutAuthApi.mockReturnValue(authApi)

      const useCheckoutWebComponent = await loadComposable()
      const { apiInitialized } = useCheckoutWebComponent(undefined)

      await getReadyHandler()()

      expect(mockLogError).toHaveBeenCalledWith({
        message: 'Checkout OAuth client ID not configured',
      })
      expect(authApi.init).not.toHaveBeenCalled()
      expect(apiInitialized.value).toBe(false)
    },
  )

  it('logs a failed auth.init instead of leaving the rejection unobserved', async () => {
    const authApi = {
      init: vi.fn().mockRejectedValue(new Error('init failed')),
      events: { listen: vi.fn() },
    }
    mockGetCheckoutAuthApi.mockReturnValue(authApi)

    const useCheckoutWebComponent = await loadComposable()
    const { apiInitialized } = useCheckoutWebComponent(undefined)

    await getReadyHandler()()
    // The catch runs a microtask after the rejected `auth.init` settles.
    await vi.waitFor(() => expect(mockLogError).toHaveBeenCalled())

    expect(mockLogError).toHaveBeenCalledWith({
      message: 'Failed to initialize the checkout auth API',
      err: expect.objectContaining({ message: 'init failed' }),
    })
    expect(apiInitialized.value).toBe(false)
  })
})
