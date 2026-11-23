// INVARIANT: This module-level state is shared across all requests in the same Node process.
// Must never be set from server-executed code, or one request's navigation would flip the flag
// for every other concurrent/subsequent request sharing the process. Always guard with
// import.meta.env.SSR before calling markNavigated().
let hasNavigatedOnce = false

/**
 * Returns whether the current render is the page's first paint (SSR or
 * client hydration of the initially requested page), as opposed to a
 * later client-side Inertia navigation.
 *
 * Non-reactive by design: a component reads this once in `setup()` to pick
 * its initial state, then tracks subsequent changes with its own refs.
 * Call {@link markNavigated} from the Inertia router's navigate event so
 * later component instances (mounted after a client-side page change)
 * report `false`.
 *
 * @returns `true` until the first page finishes its initial client-side
 *   hydration (signaled by Inertia's `navigate` event). An image hidden until
 *   a client-side event cannot be an LCP candidate; this flag lets components
 *   render their SSR'd state as already-visible instead of waiting for an event
 *   that will always fire after LCP has already been measured.
 */
export function isInitialRender(): boolean {
  return !hasNavigatedOnce
}

/**
 * Marks that the initial page has finished hydrating on the client.
 * Called by the Inertia router's navigate listener in `src/client/main.ts`.
 *
 * INVARIANT: Client-only. Must never run during SSR.
 */
export function markNavigated(): void {
  // Defense in depth: guard against accidental server-side calls.
  if (import.meta.env.SSR) {
    return
  }
  hasNavigatedOnce = true
}
