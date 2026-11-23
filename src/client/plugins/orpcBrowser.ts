import { createSafeClient } from '@orpc/client'
import { createBrowserOrpcClient } from '@scayle/storefront/client'
import type { BrowserOrpcStorefront } from '@scayle/storefront/client'
import { RPC_CLIENT_KEY } from '@client/utils/orpc'
import type { App } from 'vue'
import type { APIRouter } from '@server/api'

/**
 * Vue plugin that creates a single RPC client instance for the app and provides it via injection.
 *
 * If you want to use the RPC client in your components, you can inject it using the inject function or the useRpcClient composable.
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
 * or
 *
 * @example
 * ```ts
 * const rpcClient = useRpcClient()
 * const { error } = await rpcClient.auth.logout()
 * if (!error) {
 *   // success path
 * }
 * ```
 *
 * @param storefront - The `storefront` Inertia shared prop, passed straight through to
 *   `createBrowserOrpcClient`, which sends its shop country id as a request header.
 * @returns A Vue plugin that provides the RPC client to the app
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/rpc-api
 */
export function createBrowserOrpcPlugin(storefront: BrowserOrpcStorefront): {
  install: (app: App) => void
} {
  return {
    install(app: App) {
      app.provide(
        RPC_CLIENT_KEY,
        createSafeClient(createBrowserOrpcClient<APIRouter>(storefront)),
      )
    },
  }
}
