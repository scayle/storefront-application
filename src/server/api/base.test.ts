import { describe, it, expect } from 'vitest'
import { call } from '@orpc/server'
import {
  createMockRequestContext,
  createMockSession,
} from '../../test/utils/context'
import { authed } from './base'

// Token validation is covered by the SDK `createOrpcAuthMiddleware` tests; this
// checks only that `authed` applies the middleware.
describe('authed procedure', () => {
  it('rejects a guest without an access token as UNAUTHORIZED', async () => {
    const procedure = authed.handler(() => 'ok')
    await expect(
      call(procedure, undefined, {
        context: createMockRequestContext({
          request: { session: createMockSession({ accessToken: undefined }) },
        }),
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
