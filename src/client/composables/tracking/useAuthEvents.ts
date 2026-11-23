import { TrackingEventNames } from '@shared/types/Tracking'
import type { AUTH_FLOW_SOURCE } from '@client/types'
import { useTracking } from './useTracking'

/**
 * Value reported as the GA4 `method` parameter when a caller does not pass one.
 * `email` is the only sign-in method the Storefront Application V3 offers out of the box.
 */
const DEFAULT_AUTH_METHOD = 'email'

interface UseAuthEventsReturn {
  /**
   * Tracks a GA4 `login` event.
   *
   * `trackAuthSuccess` calls it for the SCAYLE Checkout auth flows. Call it yourself from a
   * custom sign-in surface, for example an SSO or social login callback, once the customer
   * is authenticated.
   *
   * @param method The GA4 `method` parameter, such as `'google'` or `'sso'`. Defaults to
   *   `'email'`.
   *
   * @example
   * ```ts
   * const { trackLogin } = useAuthEvents()
   *
   * // After your SSO callback has established the session:
   * trackLogin('sso')
   * ```
   */
  trackLogin: (method?: string) => void
  /**
   * Tracks a GA4 `sign_up` event.
   *
   * `trackAuthSuccess` calls it when the SCAYLE Checkout auth flow reports a registration.
   * Call it yourself from a custom registration surface once the account exists.
   *
   * @param method The GA4 `method` parameter, such as `'google'` or `'sso'`. Defaults to
   *   `'email'`.
   *
   * @example
   * ```ts
   * const { trackSignUp } = useAuthEvents()
   *
   * trackSignUp('google')
   * ```
   */
  trackSignUp: (method?: string) => void
  /**
   * Maps an `auth:success` source reported by the SCAYLE auth web component
   * to `trackLogin` or `trackSignUp` and fires it.
   *
   * {@link useCheckoutWebComponent} calls it from its `auth:success`
   * listener, so every SCAYLE auth flow is tracked whichever component
   * initialized the auth API: `<scayle-checkout>`, `<scayle-auth>` or an
   * express checkout button.
   *
   * `login` and `email-confirmation` fire `login`, `register` fires `sign_up`.
   * `email-confirmation` is the final step of account creation, so the customer
   * is authenticated for the first time and it counts as a login. Every other
   * source (`login-guest`, `new-password`, and so on) has no GA4 counterpart and
   * pushes nothing.
   *
   * @param source The source value reported by the `auth:success` event.
   */
  trackAuthSuccess: (source: AUTH_FLOW_SOURCE) => void
}

/**
 * Tracks authentication-lifecycle GA4 ecommerce events.
 *
 * Exposes `trackLogin` and `trackSignUp` for pages and custom authentication surfaces, plus
 * `trackAuthSuccess`, the source→event router {@link useCheckoutWebComponent} calls on
 * every `auth:success` of the SCAYLE auth web components.
 *
 * Each event picks up `context` from the tracking plugin. `useCheckoutWebComponent`
 * calls `trackAuthSuccess` once `useAuthentication().authenticated()` has refreshed the
 * `customer` prop, so `login` and `sign_up` carry the signed-in customer:
 * `login_state: 'logged_in'` and `user_id`. A custom authentication surface calls
 * `trackLogin` or `trackSignUp` after its own session refresh for the same context.
 *
 * All helpers no-op when the tracking plugin is not installed (server,
 * tests). `useTracking().push` logs an error and returns early in that case,
 * so the helpers do not add a separate guard.
 *
 * @returns Functions for tracking auth lifecycle events.
 *
 * @example
 * ```ts
 * const { trackLogin } = useAuthEvents()
 *
 * // After your SSO callback has established the session:
 * trackLogin('sso')
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useAuthEvents(): UseAuthEventsReturn {
  const { push } = useTracking()

  const trackLogin: UseAuthEventsReturn['trackLogin'] = (
    method = DEFAULT_AUTH_METHOD,
  ) => {
    push({ event: TrackingEventNames.Login, method })
  }

  const trackSignUp: UseAuthEventsReturn['trackSignUp'] = (
    method = DEFAULT_AUTH_METHOD,
  ) => {
    push({ event: TrackingEventNames.SignUp, method })
  }

  const trackAuthSuccess: UseAuthEventsReturn['trackAuthSuccess'] = (
    source,
  ) => {
    switch (source) {
      case 'login':
      case 'email-confirmation':
        trackLogin()
        return
      case 'register':
        trackSignUp()
    }
  }

  return {
    trackLogin,
    trackSignUp,
    trackAuthSuccess,
  }
}
