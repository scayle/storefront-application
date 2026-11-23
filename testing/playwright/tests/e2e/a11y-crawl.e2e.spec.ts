import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import {
  dismissCountryPrompt,
  scanPage,
  viewLabel,
  viewSegments,
} from '../../support/a11y'

/**
 * @file Scans a shop without knowing anything about its pages. The test opens the home page,
 * follows the links it finds inside the country of `BASE_URL`, and scans each kind of page once.
 * It opens pages with plain navigation only: it never clicks a button, fills a form, changes the
 * basket or signs in. It needs no page objects, no catalog data and no test customers. Run it with
 * `A11Y=1 pnpm test:e2e:a11y` and read the results with `pnpm a11y:summary`.
 *
 * Change the limits below to fit your shop.
 */

/** Most kinds of page to scan. */
const MAX_PAGES = 20
/** How many link hops from the home page to follow. */
const MAX_DEPTH = 2
/** Most pages to scan under one first path segment, so no section uses up the budget. */
const MAX_PER_SECTION = 3
/**
 * Paths the crawl skips: sign-out links, API paths and downloads. A shop whose sign-out path uses
 * other words adds them here. Without a country prefix in `BASE_URL`, add the other countries
 * too, for example `|^/(en|at)(/|$)`.
 */
const EXCLUDE_PATHS =
  /log-?out|sign-?out|abmelden|\/api\/|\.(pdf|zip|xml|json|csv|jpe?g|png|webp|svg)$/i

/**
 * Picks the links the crawl may follow: the same origin, inside the path prefix of `BASE_URL`,
 * and not excluded. The query string and the hash are dropped.
 */
function selectLinks(hrefs: string[], baseURL: string): string[] {
  const base = new URL(baseURL)
  const prefix = base.pathname.replace(/\/+$/, '')
  const links = new Set<string>()
  for (const href of hrefs) {
    let url: URL
    try {
      url = new URL(href)
    } catch {
      continue
    }
    const insidePrefix =
      !prefix ||
      url.pathname === prefix ||
      url.pathname.startsWith(`${prefix}/`)
    if (
      /^https?:$/.test(url.protocol) &&
      url.origin === base.origin &&
      insidePrefix &&
      !EXCLUDE_PATHS.test(url.pathname)
    ) {
      url.hash = ''
      url.search = ''
      links.add(url.toString())
    }
  }
  return [...links]
}

// The crawl scans every page itself, so the end-of-test scan would only repeat its last page.
test.use({ a11yEnabled: false })

test('crawl the shop and scan each kind of page', async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(!baseURL, 'BASE_URL is not configured')
  test.setTimeout(MAX_PAGES * 45_000)
  await dismissCountryPrompt(page)

  const queue: { url: string; depth: number }[] = [{ url: baseURL!, depth: 0 }]
  const queued = new Set<string>([viewLabel(baseURL!, baseURL)])
  const visited: string[] = []
  const skipped: string[] = []
  const perSection = new Map<string, number>()

  while (queue.length > 0 && visited.length < MAX_PAGES) {
    const { url, depth } = queue.shift()!
    const section = viewSegments(url, baseURL)[0] ?? 'home'
    if ((perSection.get(section) ?? 0) >= MAX_PER_SECTION) {
      continue
    }
    const response = await page
      .goto(url, { waitUntil: 'load' })
      .catch(() => null)
    // A redirect can lead off the shop. That page is neither scanned nor counted.
    if (
      !response ||
      response.status() >= 400 ||
      new URL(page.url()).origin !== new URL(baseURL!).origin
    ) {
      skipped.push(`${url} (${response ? response.status() : 'no response'})`)
      continue
    }
    perSection.set(section, (perSection.get(section) ?? 0) + 1)
    visited.push(new URL(page.url()).pathname)
    await scanPage(page, testInfo, viewLabel(page.url(), baseURL), {
      settle: true,
    })

    if (depth >= MAX_DEPTH) {
      continue
    }
    const hrefs = await page
      .$$eval('a[href]', (links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      )
      .catch(() => [])
    for (const link of selectLinks(hrefs, baseURL!)) {
      const label = viewLabel(link, baseURL)
      if (!queued.has(label)) {
        queued.add(label)
        queue.push({ url: link, depth: depth + 1 })
      }
    }
  }

  testInfo.annotations.push({
    type: 'a11y-crawl',
    description: `Visited ${visited.length} pages: ${visited.join(', ')}`,
  })
  if (skipped.length > 0) {
    testInfo.annotations.push({
      type: 'a11y-crawl-skipped',
      description: `Could not open ${skipped.length} pages: ${skipped.join(', ')}`,
    })
  }

  expect(
    visited.length,
    `The crawl visited no page. Check that BASE_URL (${baseURL}) opens the shop.`,
  ).toBeGreaterThan(0)
})
