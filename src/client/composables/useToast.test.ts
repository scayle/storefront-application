import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './useToast'

const mockNotification = vi.hoisted(() => ({
  show: vi.fn(),
  close: vi.fn(),
  closeAll: vi.fn(),
}))

const injectState = vi.hoisted(() => ({
  notification: mockNotification as unknown,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// Spread the real module and override only `inject`, so the composable keeps
// every other Vue export it (or anything it imports) relies on.
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    inject: () => injectState.notification,
  }
})

vi.mock('@client/plugins/notification', () => ({
  NOTIFICATION_INJECTION_KEY: Symbol('notification'),
}))

// `show()` mirrors each toast to the shared announcer; assert against the spy.
const { announce } = vi.hoisted(() => ({ announce: vi.fn() }))
vi.mock('./useAnnouncer', () => ({
  useAnnouncer: () => ({ announce }),
}))

describe('useToast', () => {
  beforeEach(() => {
    injectState.notification = mockNotification
    vi.mocked(mockNotification.show).mockReturnValue('toast-id-1')
  })

  it('should throw when notification plugin is not installed', () => {
    injectState.notification = undefined

    expect(() => useToast()).toThrow('Notification plugin not installed')
  })

  it.for([
    {
      message: 'Hello',
      options: {},
      forwarded: {
        duration: undefined,
        title: undefined,
        type: 'INFO',
        action: undefined,
      },
    },
    {
      message: 'Done',
      options: { type: 'SUCCESS' },
      forwarded: {
        duration: undefined,
        title: undefined,
        type: 'SUCCESS',
        action: undefined,
      },
    },
    {
      message: 'Failed',
      options: { type: 'ERROR' },
      forwarded: {
        duration: undefined,
        title: undefined,
        type: 'ERROR',
        action: undefined,
      },
    },
    {
      message: 'Careful',
      options: { type: 'WARNING' },
      forwarded: {
        duration: undefined,
        title: undefined,
        type: 'WARNING',
        action: undefined,
      },
    },
    {
      message: 'Note',
      options: { type: 'INFO' },
      forwarded: {
        duration: undefined,
        title: undefined,
        type: 'INFO',
        action: undefined,
      },
    },
    {
      message: 'Message',
      options: { duration: 2000, title: 'Title!' },
      forwarded: {
        duration: 2000,
        title: 'Title!',
        type: 'INFO',
        action: undefined,
      },
    },
  ] as const)(
    'forwards $message with its options to the notification plugin',
    ({ message, options, forwarded }) => {
      const toast = useToast()

      toast.show(message, options)

      expect(mockNotification.show).toHaveBeenCalledWith(message, forwarded)
    },
  )

  it('announces the toast politely by default and assertively for errors', () => {
    const toast = useToast()

    toast.show('Saved')
    expect(announce).toHaveBeenLastCalledWith('Saved', { politeness: 'polite' })

    toast.show('Failed', { type: 'ERROR' })
    expect(announce).toHaveBeenLastCalledWith('Failed', {
      politeness: 'assertive',
    })
  })

  it('should call notification.close with id', () => {
    const toast = useToast()

    toast.close('toast-123')

    expect(mockNotification.close).toHaveBeenCalledTimes(1)
    expect(mockNotification.close).toHaveBeenCalledWith('toast-123')
  })

  it('should call notification.closeAll', () => {
    const toast = useToast()

    toast.closeAll()

    expect(mockNotification.closeAll).toHaveBeenCalledTimes(1)
  })
})
