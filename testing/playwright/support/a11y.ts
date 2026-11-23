import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'

// WCAG 2.2 rules such as `target-size` are left out.
export const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'best-practice',
]

// The `a11y:summary` script reads the result files by this prefix.
const AXE_RESULT_PREFIX = 'axe-'

// The first path segment of routes whose slug may hold slashes, such as `/c/women/shoes-12`. Every
// page of such a route is one kind of page, whatever its depth. Add the segment your shop uses for
// its category pages.
const NESTED_SLUG_SECTIONS = new Set(['c'])

// Product, category and order routes put the id last (`jacket-342691`, `123`), so only a segment
// that is a number or ends in a dash and a number is an id. A slug such as `3-day-delivery` is a page.
const TRAILING_ID = /^\d+$|-\d+$/

interface ScanOptions {
  /**
   * Runs axe inside the page without the blank helper page that axe otherwise opens in the browser
   * context. Use it when a test is still driving the browser, so a test that watches for new
   * pages never sees the helper. Cross-origin frames are then not scanned.
   */
  legacyMode?: boolean
  /** Waits until the page stops changing before the scan. */
  settle?: boolean
}

// Vue stores the app instance on the mount element as `__vue_app__` once it hydrated. A page
// without an `#app` element, or one that never mounts, is scanned as it is. The wait is short, so
// a shop that isn't built like this application doesn't lose seconds on every page.
async function waitForHydration(page: Page): Promise<void> {
  await page
    .waitForLoadState('load', { timeout: 10_000 })
    .catch(() => undefined)
  const hasMountElement = await page
    .evaluate(() => document.querySelector('#app') !== null)
    .catch(() => false)
  if (!hasMountElement) {
    return
  }
  await page
    .waitForFunction(
      () =>
        Boolean(
          (document.querySelector('#app') as { __vue_app__?: unknown } | null)
            ?.__vue_app__,
        ),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => undefined)
}

// Gives up after a few seconds, so a page that never stops changing is still scanned.
async function waitForQuietDom(page: Page): Promise<void> {
  await page
    .evaluate(
      () =>
        new Promise<void>((resolve) => {
          let timer = window.setTimeout(done, 500)
          const observer = new MutationObserver(() => {
            window.clearTimeout(timer)
            timer = window.setTimeout(done, 500)
          })
          const cap = window.setTimeout(done, 5000)
          function done() {
            observer.disconnect()
            window.clearTimeout(timer)
            window.clearTimeout(cap)
            resolve()
          }
          observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
          })
        }),
    )
    .catch(() => undefined)
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Splits the path of a URL into the segments that name its kind of page. The path prefix of the
 * base URL (the country) is dropped, and a segment that is a number or ends in a dash and a number
 * becomes `id`, so
 * `/de/p/jacket-342691` gives `['p', 'id']`. The words between a nested route's first segment and
 * its id are dropped, so `/de/c/women/shoes-12` gives `['c', 'id']` like `/de/c/women-3`.
 *
 * @param url - The URL of the view.
 * @param baseURL - The suite's `BASE_URL`.
 * @returns The segments, empty for the home page.
 */
export function viewSegments(url: string, baseURL?: string): string[] {
  const path = new URL(url).pathname
  const prefix = baseURL ? new URL(baseURL).pathname.replace(/\/+$/, '') : ''
  const relative =
    prefix && (path === prefix || path.startsWith(`${prefix}/`))
      ? path.slice(prefix.length)
      : path
  const segments = relative
    .split('/')
    .filter(Boolean)
    .map(decodeSegment)
    .map((segment) =>
      TRAILING_ID.test(segment) ? 'id' : segment.toLowerCase(),
    )
  if (NESTED_SLUG_SECTIONS.has(segments[0] ?? '') && segments.at(-1) === 'id') {
    return [segments[0], 'id']
  }
  return segments
}

/**
 * Names a view by its path, so every page of the same kind gets the same name.
 *
 * @param url - The URL of the view.
 * @param baseURL - The suite's `BASE_URL`.
 * @returns The segments joined with dashes, or `home`.
 */
export function viewLabel(url: string, baseURL?: string): string {
  const segments = viewSegments(url, baseURL)
  return segments.length > 0 ? segments.join('-') : 'home'
}

// A label with letters outside a-z, such as umlauts or Cyrillic, would lose them and collide with other
// labels, so a short hash keeps those file names apart. Plain labels stay readable.
function fileLabel(label: string): string {
  const safe = label.replace(/[^\w-]+/g, '-')
  if (safe === label) {
    return safe
  }
  return `${safe}-${createHash('sha1').update(label).digest('hex').slice(0, 8)}`
}

/**
 * Marks the country switch suggestion as dismissed for every page the browser opens in this tab.
 * The dialog makes the rest of the page inert, so axe would not see anything behind it. The
 * dismissal lives in `sessionStorage`, which a new tab does not inherit.
 *
 * @param page - The page to prepare, before its first navigation.
 */
export async function dismissCountryPrompt(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem('hasPromptedCountrySwitch', 'true')
    } catch {
      // Storage is blocked, so the page keeps its default.
    }
  })
}

// The query string and the hash can carry tokens, so they never land in a result file.
function withoutQuery(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url
  }
}

/**
 * Scans the current page with axe and attaches the result to the test as `axe-<label>.json`. The
 * file holds the page URL, the project name, and the `violations` and `incomplete` lists. A scan
 * that throws is attached as `axe-failed-<label>` and never fails the test.
 *
 * @param page - The page to scan.
 * @param testInfo - The running test, used for the attachment and the output folder.
 * @param label - Short name of the scanned state, for example `basket` or `open-dialog`.
 * @param options - Scan options.
 * @returns The scanned URL, or `undefined` when the scan failed or the page changed during the
 * scan. A scan of a page that changed is dropped, because axe would have read the next page.
 */
export async function scanPage(
  page: Page,
  testInfo: TestInfo,
  label: string,
  options: ScanOptions = {},
): Promise<string | undefined> {
  const fileName = `${AXE_RESULT_PREFIX}${fileLabel(label)}.json`
  const url = page.url()
  const savedUrl = withoutQuery(url)
  try {
    await waitForHydration(page)
    if (options.settle) {
      await waitForQuietDom(page)
    }
    const { violations, incomplete } = await new AxeBuilder({ page })
      .setLegacyMode(options.legacyMode ?? false)
      .withTags(AXE_TAGS)
      .analyze()
    if (page.url() !== url) {
      return undefined
    }
    const filePath = testInfo.outputPath(fileName)
    await writeFile(
      filePath,
      JSON.stringify({
        label,
        url: savedUrl,
        project: testInfo.project.name,
        test: testInfo.titlePath.join(' > '),
        violations,
        incomplete,
      }),
    )
    await testInfo.attach(fileName, {
      path: filePath,
      contentType: 'application/json',
    })
    return url
  } catch (error) {
    if (page.isClosed() || page.url() !== url) {
      return undefined
    }
    // A file, so `a11y:summary` can count the failed scans. An attachment with only a body is
    // not written to `test-results/`.
    const failedName = `${AXE_RESULT_PREFIX}failed-${fileLabel(label)}.txt`
    const failedPath = testInfo.outputPath(failedName)
    await writeFile(
      failedPath,
      `Axe scan of ${savedUrl} failed: ${String(error)}`,
    )
    await testInfo.attach(failedName, {
      path: failedPath,
      contentType: 'text/plain',
    })
    return undefined
  }
}
