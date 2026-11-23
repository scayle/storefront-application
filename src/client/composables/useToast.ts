import { NOTIFICATION_INJECTION_KEY } from '@client/plugins/notification'
import type {
  NotificationActionHandler,
  NotificationType,
  StorefrontNotification,
} from '@client/types'
import type { ComputedRef } from 'vue'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnnouncer } from './useAnnouncer'

interface ToastOptionsBase {
  duration?: number
  type?: NotificationType
  title?: string
}

/**
 * Configuration options for a toast notification.
 *
 * Supports optional message actions (like "view order") that route to a given URL.
 * If no action is specified, the toast is purely informational and will auto-dismiss.
 */
export type ToastOptions =
  | (ToastOptionsBase & { action: 'ROUTE'; to: string; text: string })
  | (ToastOptionsBase & { action?: undefined })

/**
 * Union of possible toast action types.
 *
 * Extracted from {@link ToastOptions} via conditional type inference.
 */
export type ToastAction = ToastOptions extends { action: infer A } ? A : never

interface UseToastReturn {
  show: (message: string, options?: ToastOptions) => void
  close: (id: string) => void
  closeAll: () => void
  notifications: ComputedRef<StorefrontNotification[]>
}

/**
 * Manages toast notifications throughout the application.
 * Provides methods to show, close, and clear notifications with support for
 * actions, and optional auto-dismissal.
 *
 * Requires the notification plugin to be installed on the app (app.provide).
 * Use inside component setup.
 *
 * @returns Object containing notification list and control methods
 * @throws Error when notification plugin is not installed
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { show } = useToast()
 * </script>
 * ```
 */
export function useToast(): UseToastReturn {
  const { t } = useI18n()
  const { announce } = useAnnouncer()
  const notification = inject(NOTIFICATION_INJECTION_KEY)

  if (!notification) {
    throw new Error('Notification plugin not installed')
  }
  const {
    show: showNotification,
    close: closeNotification,
    closeAll: closeAllNotification,
    notifications,
  } = notification

  const getAction = (
    options: ToastOptions,
  ): NotificationActionHandler | undefined => {
    if (options.action === 'ROUTE') {
      return {
        text: options.text || t('notification.view'),
        href: options.to,
      }
    }
    return undefined
  }

  const show = (message: string, options: ToastOptions = {}) => {
    const { action, type, duration, title } = options

    // Toasts are visual; mirror each one to a live region so AT users hear it.
    // Errors go to the assertive region, everything else to the polite one.
    announce(message, {
      politeness: type === 'ERROR' ? 'assertive' : 'polite',
    })

    return showNotification(message, {
      duration,
      title,
      type: type ?? 'INFO',
      action: action ? getAction(options) : undefined,
    })
  }

  const close = (id: string) => {
    closeNotification(id)
  }

  const closeAll = () => {
    closeAllNotification()
  }

  return {
    show,
    close,
    closeAll,
    notifications,
  }
}
