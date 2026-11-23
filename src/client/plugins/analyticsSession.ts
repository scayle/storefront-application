import type { AnalyticsSessionStartContext } from '@scayle/storefront-api'
import { HOUR_MS } from '@client/utils/time'

const STORAGE_KEY = 'scayle-analytics-session'

// Cuts a referrer at its query or fragment. A string cut instead of rebuilding
// it from `URL`, because an app referrer such as `android-app://com.google.android.gm/`
// has the opaque origin `null`.
const QUERY_OR_HASH_TAIL = /[?#].*/s

/** The SCAYLE Analytics session as the browser stores it. */
export interface ScayleAnalyticsSession {
  /** Random UUID the browser mints when the session starts. */
  id: string
  /**
   * Epoch milliseconds of the last sent event, or of the page load that
   * started the session. The session ends one hour after it.
   */
  lastEventAt: number
  /** Attribution of the session's first page. */
  start: AnalyticsSessionStartContext
}

// The session of this page load. A live stored entry wins, so the tabs of one
// browser share a session; this copy carries it where there is no entry for
// it: before consent, where the browser blocks `localStorage`, and after a
// write failed.
let current: ScayleAnalyticsSession | undefined

/** The `window.location` parts the session start attribution is read from. */
interface SessionStartLocation {
  href: string
  origin: string
}

/**
 * Captures the session start attribution the browser alone can see: the
 * landing path, the `utm_*` values and the external referrer of the page
 * load. Only those values are read from the landing URL, and the referrer is
 * cut at its `?` or `#`, so a credential in either never reaches GTM or
 * `localStorage`. {@link initAnalyticsSession} reads it once at
 * install; a session the page load starts keeps these values for its lifetime.
 * The contract's `query_string` is not captured: neither GA4 nor the
 * analytics store reads it, and a raw query string can carry tokens.
 *
 * The referrer is reported only when it points to another origin: an empty
 * one (direct entry, hard reload) or a same-origin one (a link opened in a new
 * tab) names no session source. The analytics route cuts or drops a value
 * over its length cap.
 *
 * @param location Landing URL of the session, `window.location` at install
 * @param documentReferrer `document.referrer` at install, empty on a direct entry
 * @returns The session start fields, each absent where the landing URL or the
 *   referrer carries no value for it
 */
export function captureAnalyticsSessionStart(
  location: SessionStartLocation,
  documentReferrer: string,
): AnalyticsSessionStartContext {
  const landing = new URL(location.href)
  const param = (key: string) => landing.searchParams.get(key) ?? undefined

  let referrer: string | undefined
  try {
    if (
      documentReferrer &&
      new URL(documentReferrer).origin !== location.origin
    ) {
      referrer = documentReferrer.replace(QUERY_OR_HASH_TAIL, '')
    }
  } catch {
    // Not a URL: nothing to attribute the session to.
  }

  return {
    landing_page_path: landing.pathname,
    utm_content: param('utm_content'),
    utm_medium: param('utm_medium'),
    utm_source: param('utm_source'),
    utm_campaign: param('utm_campaign'),
    referrer,
  }
}

// An entry without a string `id` would send events the route rejects, and one
// without a `start` object would make every flush throw, until the hour runs
// out. Either counts as no session and the next touch replaces it.
const live = (session: ScayleAnalyticsSession | null | undefined) =>
  typeof session?.id === 'string' &&
  session.start instanceof Object &&
  Date.now() - session.lastEventAt < HOUR_MS
    ? session
    : undefined

/**
 * Starts the SCAYLE Analytics session of a page load: the stored session while
 * it is live, otherwise a new one in memory with the attribution of the page
 * ({@link captureAnalyticsSessionStart}). Writes nothing, so it runs before
 * consent: consent gates only the `localStorage` entry, which
 * {@link touchAnalyticsSession} writes past the consent gate.
 *
 * It also drops the in-memory copy when another tab removes the entry on a
 * decline or a withdrawal, so this tab cannot write the old id back.
 *
 * The dispatcher calls it once at install. Browser-only.
 *
 * @param location Landing URL of the page load, `window.location` at install
 * @param documentReferrer `document.referrer` at install, empty on a direct entry
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/scayle-analytics
 */
export function initAnalyticsSession(
  location: SessionStartLocation,
  documentReferrer: string,
): void {
  current = undefined
  current = readAnalyticsSession() ?? {
    id: crypto.randomUUID(),
    lastEventAt: Date.now(),
    start: captureAnalyticsSessionStart(location, documentReferrer),
  }
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue === null) {
      current = undefined
    }
  })
}

/**
 * Reads the SCAYLE Analytics session without moving it: the stored session
 * while it is live, otherwise the page load's in-memory one.
 *
 * Browser-only. Unlike {@link touchAnalyticsSession} it writes nothing, so a
 * caller outside the SCAYLE Analytics consent gate can read the session, also
 * before the user consents to SCAYLE Analytics or after a decline. Without
 * that consent nothing moves the session: it ends an hour after its last sent
 * event or the page load, each page load starts a new one, and a removal in
 * another tab ends it for the rest of the page load. The GA4 tracking plugin
 * reads `session_id` and the landing attribution here.
 *
 * @returns The session, or `undefined` when there is none or its last event
 *   went out an hour ago or more
 */
export function readAnalyticsSession(): ScayleAnalyticsSession | undefined {
  let stored: ScayleAnalyticsSession | null = null
  try {
    stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as ScayleAnalyticsSession | null
  } catch {
    // Reading `window.localStorage` throws where site data is blocked, and
    // parsing throws on a corrupt entry. The in-memory copy covers both.
  }
  // A stored entry of the same session that ran out ends it: every touch
  // writes the entry, so the in-memory copy is never newer while writes work.
  return (
    live(stored) ?? (stored?.id === current?.id ? undefined : live(current))
  )
}

/**
 * Records a send on the SCAYLE Analytics session and stores it, starting a new
 * session when {@link readAnalyticsSession} finds none. The dispatcher calls
 * it once per flush, so the session ends one hour after the last event it
 * sent. A session started here takes the current path only: the page load's
 * attribution belongs to the session {@link initAnalyticsSession} started.
 *
 * Writes the `localStorage` entry, so call it only while the SCAYLE Analytics
 * consent gate is open. Browser-only.
 *
 * @param currentPath Path of the current page, the landing path of a session
 *   that starts later in an open tab
 * @returns The session the events of this flush belong to
 */
export function touchAnalyticsSession(
  currentPath: string,
): ScayleAnalyticsSession {
  current = {
    ...(readAnalyticsSession() ?? {
      id: crypto.randomUUID(),
      start: { landing_page_path: currentPath },
    }),
    lastEventAt: Date.now(),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Blocked storage or a full quota: the in-memory copy carries the session
    // for the rest of the page load.
  }
  return current
}

/**
 * Removes the stored SCAYLE Analytics session. The dispatcher calls it when
 * the user declines or withdraws consent. The session of the page load stays
 * in memory, so a reader outside the SCAYLE Analytics consent keeps it, and a
 * grant later in the same page load continues it, until it ends an hour after
 * its last sent event or the page load: nothing moves it without consent.
 * Other open tabs drop their in-memory copy, so a reader there has no session
 * until that tab sends again.
 */
export function removeStoredAnalyticsSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing is stored where the browser blocks storage.
  }
}
