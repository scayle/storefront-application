import { router } from '@inertiajs/vue3'
import { clearCheckoutAuthStorage } from '@scayle/storefront/client'
import { createLogger, getSiteRelativePath } from '@scayle/storefront/shared'
import { useI18n } from 'vue-i18n'
import { routes } from '@shared/routes'
import { SEGMENT_DEPENDENT_ONCE_PROPS } from '@shared/constants/segments'
import type { PageProps } from '@shared/types/PageProps'
import type { AUTH_FLOW_SOURCE } from '@client/types'
import { useToast } from './useToast'
import { useRpcClient } from './useRpcClient'
import { useIsPage } from './usePageComponent'
import { useRoute } from './useRoute'

const log = createLogger('authentication')

/** Shared props that belong to the session, so a login or logout changes them. */
const SESSION_PROPS = [
  'customer',
  'basket',
  'wishlist',
  'promotions',
] as const satisfies readonly (keyof PageProps)[]

/**
 * Provides authentication actions for the storefront.
 *
 * Used by login/register pages and the account popover to handle
 * post-authentication navigation and session teardown.
 *
 * @returns An object with `authenticated` (handles post-login/register flow: shows a toast, refreshes the session props and the segment-dependent once props, and navigates to the redirect URL or home) and `logout` (clears the checkout tokens from `localStorage` whatever the outcome, logs the customer out via RPC, clears the encrypted browser history, reloads the current page on success, which the auth guard redirects to sign-in on account pages, and then reloads the segment-dependent once props if `SEGMENT_DEPENDENT_ONCE_PROPS` lists any, or shows an error toast and returns `false` on failure).
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/session
 */
export function useAuthentication() {
  const { isActive: isCheckout } = useIsPage('Checkout')
  const rpcClient = useRpcClient()
  const { show } = useToast()
  const $i18n = useI18n()
  const { query, navigate } = useRoute()

  const messageForEvent = (event: AUTH_FLOW_SOURCE) => {
    switch (event) {
      case 'login':
        return $i18n.t('authentication.notification.success.login')
      case 'register':
        return $i18n.t('authentication.notification.success.sign_up')
      case 'new-password':
        return $i18n.t('authentication.notification.success.reset_password')
      case 'login-guest':
        return $i18n.t('authentication.notification.success.guest_login')
      default:
        return undefined
    }
  }

  const refresh = () => {
    const { promise, resolve } = Promise.withResolvers<void>()
    router.reload({
      only: [...SESSION_PROPS, ...SEGMENT_DEPENDENT_ONCE_PROPS],
      onFinish: () => resolve(),
    })
    return promise
  }

  // Unsetting these props the way `unsetSessionProps` does would leave the
  // page without them until the reload answers, so they get a partial reload
  // of their own once the page is reloaded.
  const reloadSegmentDependentProps = () => {
    // Inertia treats an empty `only` as a reload of every prop.
    if (SEGMENT_DEPENDENT_ONCE_PROPS.length === 0) {
      return Promise.resolve()
    }
    const { promise, resolve } = Promise.withResolvers<void>()
    router.reload({
      only: [...SEGMENT_DEPENDENT_ONCE_PROPS],
      onFinish: () => resolve(),
    })
    return promise
  }

  // Inertia lists every once prop the page holds in
  // `X-Inertia-Except-Once-Props`, and the server leaves those out of its
  // response. An unset prop is not on that list, so the next full visit lists it
  // as deferred again, and the client loads it for the current session in one
  // follow-up request per deferred group. Until then, the header basket and
  // account controls show their `<Deferred>` fallbacks.
  const unsetSessionProps = () => {
    const { promise, resolve } = Promise.withResolvers<void>()
    router.replace({
      props: (props) => ({
        ...props,
        ...Object.fromEntries(SESSION_PROPS.map((prop) => [prop, undefined])),
      }),
      preserveScroll: true,
      preserveState: true,
      onFinish: () => resolve(),
    })
    return promise
  }

  const reloadPage = () => {
    const { promise, resolve } = Promise.withResolvers<void>()
    router.reload({ replace: true, onFinish: () => resolve() })
    return promise
  }

  const authenticated = async (event: AUTH_FLOW_SOURCE) => {
    if (isCheckout.value) {
      // The checkout web component manages post-auth navigation itself;
      // firing an Inertia redirect here would race with and break that flow.
      await refresh()
    } else {
      const message = messageForEvent(event)
      if (message) {
        show(message, { type: 'SUCCESS' })
      }
      await refresh()
      const redirectUrl = getSiteRelativePath(
        query.value.get('redirectUrl') ?? undefined,
      )

      navigate(redirectUrl ?? routes.home, { replace: true })
    }
  }

  const logout = async (): Promise<boolean> => {
    // Cleared before the call so a failed logout does not leave the tokens on a
    // shared device. A customer who stays signed in loses nothing lasting:
    // `initCheckoutAuth` seeds the web component from the server session again,
    // but only once per page load. Until the next full page load, a web
    // component already initialized on this page keeps its in-memory token
    // while `localStorage` is empty.
    clearCheckoutAuthStorage()
    const { error } = await rpcClient.auth.logout()
    if (error) {
      log.warn({
        message: 'Failed to log out',
        err: error instanceof Error ? error : new Error(String(error)),
      })
      show($i18n.t('authentication.notification.error.logout'), {
        type: 'ERROR',
      })
      return false
    }

    await unsetSessionProps()

    // Deletes the key the history entries are encrypted with, so Back on a
    // shared device cannot restore the customer's pages. Inertia loads an
    // entry it cannot decrypt from the server again. It runs after
    // `unsetSessionProps`, whose write still holds this page's customer data,
    // and before the reload, whose write holds only logged-out data.
    router.clearHistory()

    // The logout keeps the customer on the current page and reloads it, so its
    // own props follow the session too, such as the basket page's basket. On an
    // account page, the auth guard answers with a redirect to sign-in, which
    // replaces the account page's history entry.
    await reloadPage()
    await reloadSegmentDependentProps()
    return true
  }

  return {
    authenticated,
    logout,
  }
}
