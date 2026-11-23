/**
 * Longest wait, in milliseconds after hydration starts, for the browser to go
 * idle before {@link loadGtmWhenIdle} loads Google Tag Manager anyway. A user
 * who leaves before GTM loads is not reported to GTM.
 */
export const GTM_LOAD_DEADLINE_MS = 2000

/** Element id of the GTM container script, which keeps a second load out. */
export const GTM_SCRIPT_ID = 'google-tag-manager'

/**
 * Pushes the `gtm.start` marker that GTM's own snippet normally writes inline.
 *
 * Called from the client entry (`main.ts`) so the app emits no inline
 * executable script and the CSP needs no `'unsafe-inline'` in `script-src`.
 * Kept out of a Vue plugin so a page chunk that fails to resolve, or a plugin
 * that throws during install, cannot leave GTM without its start event.
 *
 * The marker only carries container load timing, so a later timestamp than the
 * classic head-inline snippet costs nothing for tag firing correctness. It has
 * to be the first event in `window.dataLayer`: GTM processes the queue in
 * order once it loads, and tags on the "All Pages" trigger would otherwise
 * fire after events pushed before it.
 *
 * @param now Timestamp written as `gtm.start`. Defaults to `Date.now()`.
 */
export function pushGtmStartEvent(now: number = Date.now()): void {
  window.dataLayer ??= []
  window.dataLayer.push({ 'gtm.start': now, event: 'gtm.js' })
}

function loadGtm(gtmId: string): void {
  if (document.getElementById(GTM_SCRIPT_ID)) {
    return
  }
  const script = document.createElement('script')
  script.id = GTM_SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?${new URLSearchParams({ id: gtmId })}`
  document.head.append(script)
}

/**
 * Loads the Google Tag Manager container the next time the browser is idle,
 * and no later than {@link GTM_LOAD_DEADLINE_MS} after the call.
 *
 * Called from the `setup` of `SFAnalyticsHead.vue`, which runs inside the task
 * that hydrates the app. Idle callbacks only run between tasks, even once their
 * timeout has passed, so GTM loads after hydration in either case. Loaded from
 * the document head, GTM and the tags it pulls in download and run while the
 * browser still loads and hydrates the page, which delays LCP and hydration
 * on mobile. Every event pushed to `window.dataLayer` before then waits there,
 * and GTM processes the queue in order when it loads.
 *
 * Safe to call more than once: a script already in the document is kept.
 *
 * @param gtmId GTM container id, `config.publicFields.gtmId` in `storefront.config.ts`.
 */
export function loadGtmWhenIdle(gtmId: string): void {
  // Not every browser ships `requestIdleCallback`. Without it GTM waits the
  // full deadline, which like the idle callback runs after hydration.
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => loadGtm(gtmId), {
      timeout: GTM_LOAD_DEADLINE_MS,
    })
  } else {
    setTimeout(loadGtm, GTM_LOAD_DEADLINE_MS, gtmId)
  }
}
