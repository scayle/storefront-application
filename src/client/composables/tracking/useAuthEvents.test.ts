import { describe, expect, it, vi } from 'vitest'
import { useAuthEvents } from './useAuthEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

describe('useAuthEvents', () => {
  describe.each([
    { helper: 'trackLogin' as const, event: 'login' },
    { helper: 'trackSignUp' as const, event: 'sign_up' },
  ])('$helper', ({ helper, event }) => {
    it(`pushes a ${event} event with the supplied method`, () => {
      useAuthEvents()[helper]('sso')

      expect(mocks.push).toHaveBeenCalledTimes(1)
      expect(mocks.push).toHaveBeenCalledWith({ event, method: 'sso' })
    })

    it("defaults method to 'email' when no method is supplied", () => {
      useAuthEvents()[helper]()

      expect(mocks.push).toHaveBeenCalledWith({ event, method: 'email' })
    })
  })

  describe('trackAuthSuccess', () => {
    it.each([
      {
        name: "'login' to a login event",
        method: 'login' as const,
        event: 'login',
        methodField: 'email',
      },
      {
        name: "'email-confirmation' to a login event",
        method: 'email-confirmation' as const,
        event: 'login',
        methodField: 'email',
      },
      {
        name: "'register' to a sign_up event",
        method: 'register' as const,
        event: 'sign_up',
        methodField: 'email',
      },
    ])('maps $name', ({ method, event, methodField }) => {
      const { trackAuthSuccess } = useAuthEvents()

      trackAuthSuccess(method)

      expect(mocks.push).toHaveBeenCalledTimes(1)
      expect(mocks.push).toHaveBeenCalledWith({
        event,
        method: methodField,
      })
    })

    it("ignores non-GA4 sources ('login-guest', 'new-password', 'init')", () => {
      const { trackAuthSuccess } = useAuthEvents()

      trackAuthSuccess('login-guest')
      trackAuthSuccess('new-password')
      trackAuthSuccess('init')

      expect(mocks.push).not.toHaveBeenCalled()
    })
  })
})
