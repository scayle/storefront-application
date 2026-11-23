import type { ComputedRef, Ref } from 'vue'
import { ref, computed, shallowReadonly } from 'vue'
import { useEventListener } from '@vueuse/core'
import type {
  RefreshTokenHook,
  ExchangeAuthCodeHook,
} from '@scayle/checkout-types'
import {
  clearCheckoutAuthStorage,
  getCheckoutAuthApi,
} from '@scayle/storefront/client'
import { createLogger } from '@scayle/storefront/shared'
import type { AuthAPI, AUTH_FLOW_SOURCE } from '@client/types'
import { useAuthentication } from './useAuthentication'
import { useAuthEvents } from './tracking/useAuthEvents'
import { useRpcClient } from './useRpcClient'
import { useStorefrontConfig } from './useStorefrontConfig'

const log = createLogger('checkout')

// Module-level singleton: the checkout script and its auth API live for the
// whole page load, so `auth.init` runs once, for the first page that mounts a
// checkout or auth web component, and later pages reuse it.
//
// INVARIANT — client-only: module scope means this state is shared across every
// request an SSR Node process handles, so only ever write it on the client.
// Nothing resets it, sign-out included: the auth API stays initialized until
// the next full page load (see `useAuthentication().logout`), so a reset would
// leave `Checkout` and `SignIn` waiting for an init that only a fresh
// `scayle.auth.ready` could start.
const apiInitialized = ref(false)

interface UseCheckoutWebComponentReturn {
  /** Whether the checkout auth API has been initialized on this page load. */
  apiInitialized: Readonly<Ref<boolean>>
  /** Computed auth API reference, or `undefined` if not yet initialized. */
  authApi: ComputedRef<AuthAPI | undefined>
}

/**
 * Manages the SCAYLE Checkout web component authentication flow.
 *
 * Initializes the auth API when the `scayle.auth.ready` event fires, sets up
 * hooks for token exchange and refresh, and on `auth:success` hands the source
 * to `useAuthentication` and, once its session refresh has resolved, tracks the
 * GA4 `login` or `sign_up` event through `useAuthEvents`.
 *
 * @param accessToken Initial access token (if already authenticated).
 * @returns Reactive API initialization state and the auth API instance when ready.
 *
 * @example
 * ```ts
 * const { apiInitialized, authApi } = useCheckoutWebComponent(accessToken)
 * if (apiInitialized.value) {
 *   // Checkout component is ready to use
 * }
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/checkout
 */
export function useCheckoutWebComponent(
  accessToken: string | undefined,
): UseCheckoutWebComponentReturn {
  const { authenticated } = useAuthentication()
  const { trackAuthSuccess } = useAuthEvents()
  const { config } = useStorefrontConfig()
  const rpcClient = useRpcClient()

  useEventListener('scayle.auth.ready', () => {
    if (apiInitialized.value) {
      return
    }
    const auth = getCheckoutAuthApi<AuthAPI>()
    if (!auth) {
      return
    }
    // `initCheckoutAuth` throws on a missing client ID and propagates a failed
    // `auth.init`. This listener is its only caller, so it has to absorb both;
    // otherwise the rejection escapes the event handler unobserved.
    initCheckoutAuth(auth).catch((error: unknown) => {
      log.error({
        message: 'Failed to initialize the checkout auth API',
        err: error instanceof Error ? error : new Error(String(error)),
      })
    })
  })

  // A guest tab still shows the sign-in form after another tab signed the
  // session in, so its exchange gets `ALREADY_SIGNED_IN`. That error carries
  // no token, and the session cookie is shared, so the token comes from a
  // refresh of the session the other tab signed in.
  async function requestTokenForAuthCode(code: string) {
    const exchange = await rpcClient.auth.exchangeAuthCode({ code })
    if (exchange.isDefined && exchange.error.code === 'ALREADY_SIGNED_IN') {
      return rpcClient.auth.refreshAccessToken()
    }
    return exchange
  }

  const exchangeAuthCodeHook: ExchangeAuthCodeHook = async ({ authCode }) => {
    const { data, error } = await requestTokenForAuthCode(authCode)

    if (error || !data?.accessToken) {
      log.error({
        message: 'Failed to exchange auth code',
        err: error instanceof Error ? error : new Error(String(error)),
      })
      throw new Error('Unable to get access token', { cause: error })
    }

    return { accessToken: data.accessToken }
  }

  const refreshTokenHook: RefreshTokenHook = async (code) => {
    if ('authorizationCode' in code && code.authorizationCode) {
      const { data, error } = await requestTokenForAuthCode(
        code.authorizationCode,
      )

      if (error || !data?.accessToken) {
        log.error({
          message: 'Failed to refresh access token',
          err: error instanceof Error ? error : new Error(String(error)),
        })
        throw new Error('Unable to get access token', { cause: error })
      }

      return { accessToken: data.accessToken }
    }

    const { data, error } = await rpcClient.auth.refreshAccessToken()

    if (error || !data?.accessToken) {
      log.error({
        message: 'Failed to refresh access token',
        err: error instanceof Error ? error : new Error(String(error)),
      })
      throw new Error('Unable to get access token', { cause: error })
    }

    return { accessToken: data.accessToken }
  }

  async function initCheckoutAuth(auth: AuthAPI) {
    // Enforces the module-scope invariant above: a server-render write would
    // outlive the request.
    if (import.meta.env.SSR) {
      return
    }

    // clear any old data
    clearCheckoutAuthStorage()

    auth.events.listen(
      // @ts-expect-error the string is correct but because of nominal typing typescript throws an error
      'auth:success',
      ({ source }: { source: AUTH_FLOW_SOURCE }) => {
        if (source === 'init') {
          return
        }
        // Tracked here rather than by the page: this listener is added once,
        // by whichever component initializes the auth API first, often an
        // express checkout button on the PDP or basket page. The event bus
        // does not await the listener, so the refresh-then-track sequence and
        // its rejection stay on this promise.
        void authenticated(source).then(() => trackAuthSuccess(source))
      },
    )

    if (!config.value.config.oauth?.clientId) {
      log.error({ message: 'Checkout OAuth client ID not configured' })
      throw new Error('Unable to load clientId')
    }

    const isAuthenticated = await auth.init({
      clientId: parseInt(config.value.config.oauth?.clientId),
      accessToken,
      hooks: {
        exchangeAuthCodeHook,
        refreshTokenHook,
      },
    })

    apiInitialized.value = true

    log.debug({ message: 'Auth API initialized' })
    if (isAuthenticated) {
      log.debug({ message: 'User is already authenticated' })
    } else {
      log.debug({ message: 'User needs to log in' })
    }
  }

  return {
    apiInitialized: shallowReadonly(apiInitialized),
    authApi: computed(() =>
      apiInitialized.value ? getCheckoutAuthApi<AuthAPI>() : undefined,
    ),
  }
}
