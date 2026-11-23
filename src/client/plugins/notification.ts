import type { App, ComputedRef, InjectionKey } from 'vue'
import { computed, ref } from 'vue'
import type { NotificationOptions, StorefrontNotification } from '@client/types'

/**
 * Default duration for notifications in milliseconds.
 */
export const DEFAULT_NOTIFICATION_DURATION = 5000

export interface NotificationPlugin {
  /** Readonly computed list of all active notifications */
  notifications: ComputedRef<StorefrontNotification[]>
  /** Shows a new notification with the specified message and options */
  show: (message: string, options?: NotificationOptions) => string
  /** Closes a specific notification by its ID */
  close: (id: string) => void
  /** Closes all active notifications */
  closeAll: () => void
}

/** Injection key for the notification plugin. Use with inject() in components. */
export const NOTIFICATION_INJECTION_KEY: InjectionKey<NotificationPlugin> =
  Symbol('notification')

/**
 * Vue plugin that provides toast notification state and methods via app.provide().
 * Recommended to use the useToast composable instead using this plugin directly.
 *
 * If you want to use this plugin directly, you can inject the plugin using the inject function.
 *
 * @example
 * ```ts
 * const notification = inject(NOTIFICATION_INJECTION_KEY)
 *
 * if (notification) {
 *   notification.show('Hello, world!')
 *   notification.close('123')
 *   notification.closeAll()
 * }
 *
 * ```
 */
export function createNotificationPlugin(): {
  install: (app: App) => void
} {
  return {
    install(app: App) {
      const notifications = ref<StorefrontNotification[]>([])

      const close = (id: string) => {
        notifications.value = notifications.value.filter(
          (item) => item.id !== id,
        )
      }

      const show = (
        message: string,
        {
          duration = DEFAULT_NOTIFICATION_DURATION,
          action,
          type,
          title,
        }: NotificationOptions = {},
      ) => {
        const id = `${crypto.randomUUID()}`

        notifications.value.push({
          message,
          id,
          duration,
          action,
          title,
          type: type ?? 'INFO',
        })

        // Expiring here rather than in `SFToast` keeps a toast shown on a page
        // without a toast container (`SimpleLayout`) from waiting there and
        // showing up on the next page.
        if (!import.meta.env.SSR && duration > 0) {
          setTimeout(close, duration, id)
        }

        return id
      }

      const closeAll = () => {
        notifications.value = []
      }

      const plugin: NotificationPlugin = {
        notifications: computed(() => notifications.value),
        show,
        close,
        closeAll,
      }

      app.provide(NOTIFICATION_INJECTION_KEY, plugin)
    },
  }
}
