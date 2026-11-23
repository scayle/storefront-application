import type { Scayle } from '@scayle/checkout-types'
import type { DefineComponent } from 'vue'

// Page component with optional layout
export interface PageComponent extends DefineComponent {
  layout?: DefineComponent
}

// Page module export format
export interface PageModule {
  default: PageComponent
}

/**
 * Extracts numeric transition duration values from the Tailwind config.
 * Excludes the `'DEFAULT'` key and converts duration keys to numeric literal types.
 *
 * This type ensures type-safe transition durations that match your Tailwind configuration.
 *
 * @example
 * ```ts
 * // Assuming your tailwind.config has durations: 100, 200, 300, 500, 1000
 * const duration: TransitionDuration = 300 // ✓ Valid
 * const invalid: TransitionDuration = 400  // ✗ Type error
 * ```
 */
export type TransitionDuration =
  Exclude<string, 'DEFAULT'> extends `${infer N extends number}` ? N : never

/**
 * Status type for Global toast notifications.
 */
export type NotificationType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO'

/**
 * Configuration options for displaying a notification.
 */
export interface NotificationOptions {
  /** Duration in milliseconds before auto-dismissal. Omit to persist until dismissed. */
  duration?: number
  /** Optional action button configuration for user interaction */
  action?: NotificationActionHandler
  /** Optional headline shown above the message (Global toast) */
  title?: string
  /** Notification status type */
  type?: NotificationType
}

/**
 * Available actions for notification click handlers.
 */
export interface NotificationOnClickActions {
  /** Closes the notification */
  close: () => void
  /** Additional custom actions can be added */
  [key: string]: () => void
}

/**
 * Configuration for a notification action button.
 */
export interface NotificationActionHandler {
  /** Button text label */
  text: string
  /** Optional CSS classes for styling */
  class?: string
  /** Optional navigation route */
  href?: string
  /** Click handler with access to notification actions */
  onClick?: (actions: NotificationOnClickActions) => void
}

/**
 * Internal notification data structure for the Global toast stack.
 */
export interface StorefrontNotification {
  /** Unique identifier for the notification */
  id: string
  /** Notification message text */
  message: string
  /** Display duration in milliseconds. Omit to persist until dismissed. */
  duration?: number
  /** Optional headline above the message */
  title?: string
  /** Optional action link configuration */
  action?: NotificationActionHandler
  /** Notification status type */
  type: NotificationType
}

declare global {
  /**
   * Extends the global Window interface to include the `scayle` object.
   * The checkout web component script (loaded via `useScript` in `useCheckoutWebComponent`)
   * attaches the SCAYLE Checkout API to `window.scayle`, providing access to authentication
   * and checkout functionality (e.g., `window.scayle.auth.V3`).
   * Used in checkout-related composables and components to interact with the SCAYLE Checkout SDK.
   */
  interface Window {
    /** Set by the checkout web component script when loaded */
    scayle?: Scayle
    dataLayer?: object[]
  }

  /**
   * Extends the global WindowEventMap to include custom events dispatched by the checkout web component.
   * These events are fired by the SCAYLE Checkout SDK when different parts of the authentication system are ready.
   * Used with `useEventListener` from VueUse to react to checkout lifecycle events.
   */
  interface WindowEventMap {
    /**
     * Fired when the authentication API is ready to use.
     * Used in `useCheckoutWebComponent` to initialize the auth API after the checkout script loads.
     * The SCAYLE Checkout Web Component dispatches this event on the window when `window.scayle.auth.V3` becomes available.
     */
    'scayle.auth.ready': void
  }

  /**
   * Extends DocumentEventMap for storefront-dispatched express checkout lifecycle events.
   * Used with `useEventListener(document, …)` and `document.dispatchEvent`.
   */
  interface DocumentEventMap {
    /**
     * Returns the express checkout button to its default state.
     * Dispatched when the size dropdown is abandoned or an express error occurs.
     * The checkout web component listens for this on `document`.
     */
    'scayle:express:reset': Event
  }
}

export type AuthAPI = Scayle['auth']['V3']
export type AUTH_FLOW_SOURCE =
  | 'login'
  | 'login-guest'
  | 'register'
  | 'new-password'
  | 'email-confirmation'
  /** Emitted by the checkout web component once the auth API is ready; non-UI source. */
  | 'init'

/**
 * One page entry for the pagination UI (number, link, active state).
 */
export interface Page {
  /** 1-based page index */
  number: number
  /** Link URL, keeps existing query params. Page 1 omits `?page=1`. */
  to: string
  /** True when this page is the current one */
  isActive: boolean
}
