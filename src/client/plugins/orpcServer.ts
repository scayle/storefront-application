import { createSafeClient } from '@orpc/client'
import { createSsrOrpcClient } from '@scayle/storefront'
import type { SsrOrpcClientOptions } from '@scayle/storefront'
import { RPC_CLIENT_KEY } from '@client/utils/orpc'
import type { RpcClient } from '@client/utils/orpc'
import type { App } from 'vue'
import type { APIRouter } from '@server/api'
import { apiRouter } from '@server/api'

/**
 * Vue plugin that creates an SSR RPC client and provides it via injection.
 *
 * The client calls the API router directly in-process (no HTTP round-trip)
 * and requires the server-side storefront context and session.
 *
 * Construction is deferred to the first procedure access. `createSsrOrpcClient`
 * throws when the request carries no storefront context, and this plugin is
 * installed on every server render — including the Error page, which renders
 * precisely on requests that may lack one. Building the client eagerly turned
 * that into a second throw while the error handler was already unwinding, so
 * the response lost the original error and reported a missing RPC context
 * instead. A page that never calls a procedure now never constructs a client.
 *
 * @example
 * ```ts
 * const rpcClient = inject(RPC_CLIENT_KEY)
 * if (rpcClient) {
 *    const { error } = await rpcClient.auth.logout()
 *    if (!error) {
 *      // success path
 *    }
 * }
 * ```
 *
 * @param options - Server-side storefront context and session
 * @returns A Vue plugin that provides the RPC client to the app
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/rpc-api
 */
export function createSsrOrpcPlugin(options: SsrOrpcClientOptions): {
  install: (app: App) => void
} {
  return {
    install(app: App) {
      let client: RpcClient | undefined

      // A `Proxy` stands in for the client so the injected value keeps its
      // shape: `useRpcClient()` and every call site stay unchanged, only the
      // moment of construction moves. The `get` trap runs on every property
      // read (`rpcClient.auth`, `rpcClient.basket`, …), builds the real client
      // the first time, and hands the read on to it. `Reflect.get(client, …)`
      // is the plain way to spell "read this property off that object" —
      // equivalent to `client[property]` here, and the conventional form
      // inside a trap.
      const lazyClient = new Proxy({} as RpcClient, {
        get(_target, property) {
          client ??= createSafeClient(
            createSsrOrpcClient<APIRouter>(apiRouter, options),
          )
          return Reflect.get(client, property) as unknown
        },
      })

      app.provide(RPC_CLIENT_KEY, lazyClient)
    },
  }
}
