import { createApp, inject } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationOptions, StorefrontNotification } from '@client/types'
import {
  createNotificationPlugin,
  DEFAULT_NOTIFICATION_DURATION,
  NOTIFICATION_INJECTION_KEY,
} from './notification'
import type { NotificationPlugin } from './notification'

function getProvidedApi(app: ReturnType<typeof createApp>): NotificationPlugin {
  return app.runWithContext(() => inject(NOTIFICATION_INJECTION_KEY))!
}

describe('createNotificationPlugin', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-uuid-1'),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have empty notifications by default', () => {
    const app = createApp({ template: '<div />' })
    createNotificationPlugin().install(app)
    const api = getProvidedApi(app)

    expect(api.notifications.value).toStrictEqual([])
  })

  it.for([
    {
      message: 'Hello, world!',
      options: { type: 'SUCCESS' },
      notification: {
        id: 'test-uuid-1',
        message: 'Hello, world!',
        type: 'SUCCESS',
        duration: DEFAULT_NOTIFICATION_DURATION,
      },
    },
    {
      message: 'Hello',
      options: {},
      notification: {
        id: 'test-uuid-1',
        message: 'Hello',
        type: 'INFO',
        duration: DEFAULT_NOTIFICATION_DURATION,
      },
    },
    {
      message: 'Custom duration',
      options: { type: 'SUCCESS', duration: 3000 },
      notification: {
        id: 'test-uuid-1',
        message: 'Custom duration',
        type: 'SUCCESS',
        duration: 3000,
      },
    },
    {
      message: 'With action',
      options: {
        type: 'SUCCESS',
        action: { text: 'VIEW', href: '/cart' },
        title: 'Added',
      },
      notification: {
        id: 'test-uuid-1',
        message: 'With action',
        type: 'SUCCESS',
        duration: DEFAULT_NOTIFICATION_DURATION,
        action: { text: 'VIEW', href: '/cart' },
        title: 'Added',
      },
    },
  ] as {
    message: string
    options: NotificationOptions
    notification: StorefrontNotification
  }[])(
    'shows "$message" with its options',
    ({ message, options, notification }) => {
      const app = createApp({ template: '<div />' })
      createNotificationPlugin().install(app)
      const api = getProvidedApi(app)

      const id = api.show(message, options)

      expect(id).toBe(notification.id)
      expect(api.notifications.value).toEqual([notification])
    },
  )

  it('should close a notification once its duration passed, with no toast mounted', () => {
    vi.useFakeTimers()
    vi.stubEnv('SSR', false)
    const app = createApp({ template: '<div />' })
    createNotificationPlugin().install(app)
    const api = getProvidedApi(app)

    api.show('Expires', { duration: 3000 })
    vi.advanceTimersByTime(2999)
    expect(api.notifications.value).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(api.notifications.value).toStrictEqual([])
  })

  it('should close notification by id', () => {
    const app = createApp({ template: '<div />' })
    createNotificationPlugin().install(app)
    const api = getProvidedApi(app)

    const id = api.show('To close', { type: 'ERROR' })
    expect(api.notifications.value).toHaveLength(1)

    api.close(id)
    expect(api.notifications.value).toStrictEqual([])
  })

  it('should only remove the matching notification when closing', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('id-1')
        .mockReturnValueOnce('id-2'),
    })
    const app = createApp({ template: '<div />' })
    createNotificationPlugin().install(app)
    const api = getProvidedApi(app)

    api.show('First', { type: 'INFO' })
    api.show('Second', { type: 'WARNING' })
    expect(api.notifications.value).toHaveLength(2)

    api.close('id-1')
    expect(api.notifications.value).toHaveLength(1)
    expect(api.notifications.value[0]?.id).toBe('id-2')
    expect(api.notifications.value[0]?.message).toBe('Second')
  })

  it('should close all notifications', () => {
    const app = createApp({ template: '<div />' })
    createNotificationPlugin().install(app)
    const api = getProvidedApi(app)

    api.show('First', { type: 'INFO' })
    api.show('Second', { type: 'ERROR' })
    expect(api.notifications.value).toHaveLength(2)

    api.closeAll()
    expect(api.notifications.value).toStrictEqual([])
  })
})
