/**
 * Builds a successful safe oRPC result for tests.
 *
 * @param data - Procedure output returned on success
 * @returns A safe result object with `error: null`
 */
export function createSafeSuccess<T>(data: T) {
  return {
    data,
    error: null,
    isDefined: false,
    isSuccess: true,
  } as const
}

/**
 * Builds a failed safe oRPC result for tests.
 *
 * @param error - Error returned on failure
 * @param isDefined - Whether the error is a typed oRPC error
 * @returns A safe result object with `data: undefined`
 */
export function createSafeFailure<TError>(error: TError, isDefined = false) {
  return {
    data: undefined,
    error,
    isDefined,
    isSuccess: false,
  } as const
}

/**
 * Builds the `@client/composables/useRpcClient` mock shared by composable tests.
 *
 * Every state composable test (`useBasket`, `useWishlist`, `usePromotionCode`, …)
 * used to inline the same `vi.mock('@client/composables/useRpcClient', () => ({
 * useRpcClient: () => ({ <namespace>: { <method>: vi.fn() } }) }))` wrapper,
 * diverging only in which namespace/procedures it exposes. This centralizes the
 * `useRpcClient` wrapper so a test only declares the client slice it exercises.
 *
 * Call it inside the mock factory; seed each procedure with a `vi.hoisted`
 * `vi.fn()` handle so tests can set return values and assert calls:
 *
 * @example
 * ```ts
 * const mocks = vi.hoisted(() => ({ rpcToggle: vi.fn() }))
 *
 * vi.mock('@client/composables/useRpcClient', async () => {
 *   const { createRpcClientMock } = await import('@test/utils/orpc')
 *   return createRpcClientMock({ wishlist: { toggle: mocks.rpcToggle } })
 * })
 * ```
 *
 * @param client - Partial oRPC client, keyed by namespace, exposing only the procedures under test
 * @returns A module mock object exposing `useRpcClient` that returns `client`
 */
export function createRpcClientMock(client: Record<string, unknown>) {
  return {
    useRpcClient: () => client,
  }
}
