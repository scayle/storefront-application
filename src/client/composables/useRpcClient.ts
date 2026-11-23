import { RPC_CLIENT_KEY } from '@client/utils/orpc'
import type { RpcClient } from '@client/utils/orpc'
import { inject } from 'vue'

/**
 * Composable that returns the global safe RPC client instance.
 *
 * Procedure calls resolve to `{ error, data, isDefined, isSuccess }` instead of
 * throwing. Check `error` before using `data`.
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
 * @returns The global safe RPC client instance
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/rpc-api
 */
export function useRpcClient(): RpcClient {
  return inject(RPC_CLIENT_KEY)!
}
