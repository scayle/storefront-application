import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * What the page reports about the deferred props of the Inertia page it currently shows.
 */
interface DeferredReloadSnapshot {
  /**
   * The props of every deferred group, joined by `,` like the `only` list of the request
   * that loads the group. `null` until the page reports its first navigation, and after a
   * visit to another page started and before that page arrived.
   */
  expected: string[] | null
  /** The groups of the current page whose request has finished, failed or been cancelled. */
  answered: string[]
  /** The groups of the current page whose request is still running. */
  pending: string[]
}

interface TrackedWindow {
  __sfDeferredReloads?: { snapshot: () => DeferredReloadSnapshot }
}

/**
 * Runs in the browser before the scripts of every document, so it sees the first page
 * Inertia shows. It follows the events Inertia dispatches on `document`:
 *
 * - `inertia:navigate` carries the page and its `deferredProps`, the groups Inertia is going
 *   to request. A visit that keeps props the page already holds, such as a pagination visit,
 *   lists none, even though the server still names the groups in `initialDeferredProps`.
 * - `inertia:start` and `inertia:finish` of a visit with `deferredProps` mark the request of
 *   one group. `finish` fires after Inertia applied the reply, and also after a failure or a
 *   cancel.
 * - A visit to another page starts before its deferred groups do, so it opens a new epoch.
 *   A group counts for the epoch its request started in, also when it ends later. A visit
 *   that ends without showing a page, because it failed or was cancelled, returns to the
 *   epoch of the page that is still shown.
 *
 * The function is serialized into the page, so it must not use anything from this module.
 */
function trackDeferredReloadsInBrowser() {
  interface Visit {
    only?: string[]
    async?: boolean
    prefetch?: boolean
    deferredProps?: boolean
  }

  let epoch = 0
  let latestEpoch = 0
  let expected: string[] | null = null
  let shownBeforeVisits: { epoch: number; expected: string[] | null } | null =
    null
  const answeredIn = new Map<number, Set<string>>([[0, new Set()]])
  const groupStartedIn = new Map<Visit, number>()
  const pageVisits = new Set<Visit>()
  const groupOf = (visit: Visit) => (visit.only ?? []).join(',')
  const visitOf = (event: Event) =>
    (event as CustomEvent<{ visit: Visit }>).detail.visit

  document.addEventListener('inertia:start', (event) => {
    const visit = visitOf(event)
    if (visit.deferredProps) {
      groupStartedIn.set(visit, epoch)
    } else if (!visit.async && !visit.prefetch) {
      if (pageVisits.size === 0) {
        shownBeforeVisits = { epoch, expected }
      }
      latestEpoch += 1
      epoch = latestEpoch
      answeredIn.set(epoch, new Set())
      expected = null
      pageVisits.add(visit)
    }
  })

  document.addEventListener('inertia:finish', (event) => {
    const visit = visitOf(event)
    const startedIn = groupStartedIn.get(visit)
    if (startedIn !== undefined) {
      groupStartedIn.delete(visit)
      answeredIn.get(startedIn)?.add(groupOf(visit))
    }
    if (
      pageVisits.delete(visit) &&
      pageVisits.size === 0 &&
      expected === null &&
      shownBeforeVisits
    ) {
      epoch = shownBeforeVisits.epoch
      expected = shownBeforeVisits.expected
    }
  })

  document.addEventListener('inertia:navigate', (event) => {
    const { page } = (
      event as CustomEvent<{
        page: { deferredProps?: Record<string, string[]> }
      }>
    ).detail
    expected = Object.values(page.deferredProps ?? {}).map((props) =>
      props.join(','),
    )
  })
  ;(window as unknown as TrackedWindow).__sfDeferredReloads = {
    snapshot: () => ({
      expected,
      answered: [...(answeredIn.get(epoch) ?? [])],
      pending: [...groupStartedIn]
        .filter(([, startedIn]) => startedIn === epoch)
        .map(([visit]) => groupOf(visit)),
    }),
  }
}

const trackedPages = new WeakSet<Page>()

/**
 * Starts following the deferred props of every Inertia page the given page shows. The
 * `page` fixture calls this when it creates the page, before the first navigation, so
 * every page object of a test shares one tracker. A page that was loaded before this call
 * is not covered until its next document load.
 *
 * @param page - The Playwright page to track.
 */
export async function installDeferredReloadTracking(page: Page) {
  if (trackedPages.has(page)) {
    return
  }
  trackedPages.add(page)
  await page.addInitScript(trackDeferredReloadsInBrowser)
}

type SnapshotRead =
  | { state: 'read'; snapshot: DeferredReloadSnapshot }
  | { state: 'not tracked' }
  | { state: 'navigating' }

async function readSnapshot(page: Page): Promise<SnapshotRead> {
  try {
    const snapshot = await page.evaluate(() =>
      (window as unknown as TrackedWindow).__sfDeferredReloads?.snapshot(),
    )
    return snapshot ? { state: 'read', snapshot } : { state: 'not tracked' }
  } catch {
    // The document is being replaced, so the next read finds the new one.
    return { state: 'navigating' }
  }
}

function notTrackedError(page: Page, cause?: unknown) {
  return new Error(
    `Deferred reloads are not tracked on ${page.url()}. Use the page of the \`page\` fixture, or load the page again after the tracking started.`,
    { cause },
  )
}

/**
 * Waits until every deferred group of the Inertia page that is currently shown has been
 * requested and answered, and no deferred request is still running. A group counts as
 * answered when its request finished, failed or was cancelled, and the wait ends after
 * Inertia applied the reply. After a visit to another page, the groups of the new page
 * are the ones waited for. A page without deferred props is ready as soon as it is shown.
 *
 * Inertia loads these props after the page mounts, one request per group. A reply carries
 * the URL the page had when it was requested and replaces the page URL when it arrives,
 * so it can undo a `variantId` that was set in between.
 *
 * The tracker follows the visits Inertia starts. After Back or Forward, and after a click
 * that Inertia serves from its prefetch cache (a `prefetch-on-press` link), no visit starts,
 * so the wait can return for the previous page. Wait for the new page first, for example
 * with `toHaveURL`.
 *
 * It throws at once when the page is not tracked. It also throws when the page never
 * reported a navigation, and when the groups do not arrive within the timeout. The message
 * of the last case gives the number of answered groups and the props of the groups that
 * are still unanswered or pending.
 *
 * @param page - The Playwright page, created by the `page` fixture.
 * @param timeout - How long to wait, in milliseconds.
 */
export async function waitForDeferredReloads(page: Page, timeout = 10_000) {
  const first = await readSnapshot(page)
  if (first.state === 'not tracked') {
    throw notTrackedError(page)
  }

  try {
    await expect
      .poll(
        async () => {
          const read = await readSnapshot(page)
          return (
            read.state === 'read' &&
            read.snapshot.expected !== null &&
            read.snapshot.pending.length === 0 &&
            read.snapshot.expected.every((group) =>
              read.snapshot.answered.includes(group),
            )
          )
        },
        { timeout },
      )
      .toBe(true)
  } catch (error) {
    const last = await readSnapshot(page)
    if (last.state === 'not tracked') {
      throw notTrackedError(page, error)
    }
    if (last.state === 'navigating') {
      throw new Error(
        `The page kept navigating on ${page.url()}, so its deferred props could not be read`,
        { cause: error },
      )
    }
    const { snapshot } = last
    if (snapshot.expected === null) {
      throw new Error(
        `Inertia did not report a page on ${page.url()}, so the deferred props to wait for are unknown`,
        { cause: error },
      )
    }
    const unanswered = snapshot.expected.filter(
      (group) => !snapshot.answered.includes(group),
    )
    const details = [
      `${snapshot.expected.length - unanswered.length} of ${snapshot.expected.length} groups answered`,
    ]
    if (unanswered.length > 0) {
      details.push(`unanswered: ${unanswered.join(' | ')}`)
    }
    if (snapshot.pending.length > 0) {
      details.push(`pending: ${snapshot.pending.join(' | ')}`)
    }
    throw new Error(`Deferred props did not arrive: ${details.join(', ')}`, {
      cause: error,
    })
  }
}
