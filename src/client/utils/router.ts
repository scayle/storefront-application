import { router } from '@inertiajs/vue3'
import type {
  CancelToken,
  GlobalEvent,
  HttpExceptionResponse,
  Page,
  PendingVisit,
  VisitOptions,
} from '@inertiajs/core'
import type { useToast } from '@client/composables/useToast'

/**
 * Why a {@link partialReload} failed: the error response the server answered
 * with, or the network error when no response arrived.
 */
export type ReloadError = HttpExceptionResponse | Error

/**
 * Decides what the user sees when an Inertia request fails with an HTTP error.
 * Registered as the global `httpException` listener in `main.ts`.
 *
 * Keeps the page for a failed request to its own URL and for a server error on
 * its own path, and shows the error toast with a Reload link to the page URL.
 *
 * @param event - The `httpException` event. Calling `preventDefault` keeps the
 * current page instead of showing the error response.
 * @param page - The current page.
 * @param toast - The toast API from `useToast`.
 * @param text - The translated toast texts.
 * @param text.message - The error message, also used to find a visible error toast.
 * @param text.reload - The Reload link text.
 */
export function handleHttpException(
  event: GlobalEvent<'httpException'>,
  page: Pick<Page, 'url' | 'component'>,
  toast: Pick<ReturnType<typeof useToast>, 'show' | 'notifications'>,
  text: { message: string; reload: string },
): void {
  const { status, data } = event.detail.response
  const { url } = data as { url?: string }
  // A server error for this page's own path, mainly a failed filter, sort, or
  // page change, keeps the page, so the URL, the controls, and the products
  // stay on the last result that loaded. A 4xx for a new query, like a 404,
  // still shows its page.
  if (
    url === page.url ||
    (status >= 500 &&
      url &&
      new URL(url, location.href).pathname === location.pathname)
  ) {
    event.preventDefault()
  }
  if (page.component === 'Error' || page.component === 'NotFound') {
    return
  }

  // Each deferred props group is its own request, so one outage can fail
  // several of them at once.
  if (
    toast.notifications.value.some(
      (n) => n.message === text.message && n.action?.href === page.url,
    )
  ) {
    return
  }

  toast.show(text.message, {
    type: 'ERROR',
    action: 'ROUTE',
    to: page.url,
    text: text.reload,
  })
}

/**
 * Keeps the page URL as it is when the reply to a deferred props request
 * arrives. Registered as Inertia's `visitOptions` default in `main.ts`.
 *
 * Inertia requests each deferred group after the page mounts, with the URL the
 * page has at that moment, and by default the reply sets the page URL back to
 * that one, as a new history entry when the two differ. A URL the page changed
 * in between, such as the `variantId` of a size picked on the product page or
 * the image view on a listing, is undone when a late reply arrives. Requests
 * other than deferred props keep Inertia's default.
 *
 * With `preserveUrl` Inertia also leaves the history entry as it is, so Back
 * and Forward to the page request its deferred props again.
 *
 * @param _href - The URL of the visit. Unused; part of Inertia's callback signature.
 * @param options - The options the visit was started with. Inertia's own
 * deferred props requests carry `deferredProps: true`, which its public
 * `VisitOptions` type does not declare.
 * @returns `{ preserveUrl: true }` for a deferred props request, otherwise no overrides.
 */
export function preserveUrlOnDeferredReload(
  _href: string,
  options: VisitOptions,
): VisitOptions {
  return 'deferredProps' in options && options.deferredProps === true
    ? { preserveUrl: true }
    : {}
}

/**
 * Reports whether a visit should not be treated as the user leaving the page.
 *
 * Inertia fires the same `before` event for a real navigation, a partial
 * reload, and a prefetch. A wishlist toggle, a basket mutation or a filter
 * change reloads props in place; `router.prefetch()` from a `prefetch-on-press`
 * link fetches another page without leaving this one. Neither is navigation,
 * and an overlay that closes on one dismisses itself mid-interaction.
 *
 * The three partial markers mirror Inertia's own `RequestParams.isPartial()`,
 * so a visit this returns `false` for is one Inertia also treats as a full
 * page load.
 *
 * @param visit - The pending visit carried by an Inertia router event.
 * @returns `true` when the visit only refreshes props, or prefetches without navigating.
 */
export function isPartialReload(visit: PendingVisit): boolean {
  return (
    visit.prefetch ||
    visit.only.length > 0 ||
    visit.except.length > 0 ||
    visit.reset.length > 0
  )
}

/** Outcome of a {@link partialReload}. */
export interface ReloadResult {
  /**
   * The error response or network error, when the request failed. The global
   * `httpException` or `networkError` listener in `main.ts` has already shown
   * the error toast by the time the reload resolves.
   */
  error?: ReloadError
  /**
   * Whether the request was cancelled before it delivered. Inertia cancels
   * in-flight async requests on navigation and fires `onFinish` without an
   * error, so `error` alone cannot tell a cancellation from a success.
   */
  cancelled?: boolean
}

interface ReloadState {
  cancelToken: CancelToken | undefined
  pendingResolvers: Array<(result: ReloadResult) => void>
  currentRequestId: string
}

const states = new Map<string, ReloadState>()

/**
 * Reloads only the specified Inertia page props.
 *
 * Concurrent calls with the same `only` list are coalesced: all pending callers resolve together
 * once the most recent request finishes. Earlier in-flight requests are cancelled automatically.
 * Calls with different `only` lists maintain independent state and never interfere with each other.
 *
 * State is shared at module level, so multiple composable instances that reload the same props
 * participate in the same coalescing group.
 *
 * @param only Inertia prop names to reload
 * @returns A promise that resolves once the reload completes, with `error` set
 * when it failed and `cancelled` set when it never delivered because the user
 * navigated away. A caller that treats the reloaded props as the result of its
 * own mutation has to check both: either way the props keep their previous
 * values. A failed reload has already shown the global error toast, so the
 * caller shows no toast of its own for it.
 *
 * @example
 * ```ts
 * const { error, cancelled } = await partialReload(['basket'])
 * ```
 */
export function partialReload(only: string[]): Promise<ReloadResult> {
  const key = only.join('-')
  let state = states.get(key)
  if (!state) {
    state = {
      cancelToken: undefined,
      pendingResolvers: [],
      currentRequestId: '',
    }
    states.set(key, state)
  }

  const { promise, resolve } = Promise.withResolvers<ReloadResult>()

  const requestId = (state.currentRequestId = crypto.randomUUID())
  state.cancelToken?.cancel()
  state.pendingResolvers.push(resolve)

  let lastError: ReloadError | undefined
  let wasCancelled = false
  // Return nothing, since `false` would also skip the global error toast.
  // `onError` is not a failure here: Inertia calls it for validation errors in
  // `props.errors` after the props landed, and the server sends none.
  const recordError = (error: ReloadError) => {
    lastError = error
  }

  router.reload({
    only,
    onHttpException: recordError,
    onNetworkError: recordError,
    // Fired before `onFinish` for both a cancelled and an interrupted request.
    // Coalesced calls above cancel the superseded request, whose `onFinish`
    // bails on the request-id check below, so this only ever reports a
    // cancellation that came from outside — navigating away.
    onCancel: () => {
      wasCancelled = true
    },
    onFinish: () => {
      if (requestId !== state.currentRequestId) {
        return
      }
      const result = { error: lastError, cancelled: wasCancelled }
      for (const resolveFn of state.pendingResolvers) {
        resolveFn(result)
      }
      state.pendingResolvers = []
    },
    onCancelToken: (token) => {
      state.cancelToken = token
    },
  })

  return promise
}
