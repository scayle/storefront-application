import { createApp, inject } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SsrOrpcClientOptions } from '@scayle/storefront'
import { RPC_CLIENT_KEY } from '@client/utils/orpc'
import type { RpcClient } from '@client/utils/orpc'
import { createSsrOrpcPlugin } from './orpcServer'

const createSsrOrpcClient = vi.hoisted(() => vi.fn())

vi.mock('@scayle/storefront', () => ({ createSsrOrpcClient }))
vi.mock('@orpc/client', () => ({
  createSafeClient: (client: unknown) => client,
}))
vi.mock('@server/api', () => ({ apiRouter: {} }))

/** Mirrors the guard in `createSsrOrpcClient` for a request with no storefront context. */
const throwOnMissingContext = () => {
  createSsrOrpcClient.mockImplementation(() => {
    throw new Error(
      'RPC client requires the storefront context and the inbound request.',
    )
  })
}

const installPlugin = () => {
  const app = createApp({})
  app.use(createSsrOrpcPlugin({} as SsrOrpcClientOptions))
  return app.runWithContext(() =>
    inject(RPC_CLIENT_KEY),
  ) as unknown as RpcClient
}

describe('createSsrOrpcPlugin', () => {
  it('does not construct the client while installing', () => {
    // The Error page renders on requests that may carry no storefront context.
    // Constructing eagerly threw there, replacing the original error.
    throwOnMissingContext()

    expect(() => installPlugin()).not.toThrow()
    expect(createSsrOrpcClient).not.toHaveBeenCalled()
  })

  it('constructs the client once on first procedure access', () => {
    const logout = vi.fn()
    createSsrOrpcClient.mockReturnValue({ auth: { logout } })

    const client = installPlugin() as unknown as { auth: { logout: unknown } }
    expect(createSsrOrpcClient).not.toHaveBeenCalled()

    expect(client.auth.logout).toBe(logout)
    expect(client.auth.logout).toBe(logout)
    expect(createSsrOrpcClient).toHaveBeenCalledTimes(1)
  })

  it('surfaces the construction error on first access', () => {
    throwOnMissingContext()

    const client = installPlugin() as unknown as { auth: unknown }

    expect(() => client.auth).toThrow(
      'RPC client requires the storefront context and the inbound request.',
    )
  })
})
