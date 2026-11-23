import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'
import { getAllLinksFromPage } from '../../support/utils'

/**
 * @file Contains end-to-end tests for the homepage, verifying its basic structure and links integrity.
 */

test.beforeEach(async ({ homePage, countryDetector, page }) => {
  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await page.waitForLoadState('domcontentloaded')
  await countryDetector.closeModal()
})

/**
 * Verifies that the main content area of the homepage,
 * the main header, and the footer are visible upon page load.
 */
test('C2141227 Verify Homepage sections', async ({
  homePage,
  header,
  footer,
}) => {
  await expect(async () => {
    await homePage.homepageMainContent.waitFor()
    await expect(header.mainHeader).toBeVisible()
    await expect(footer.footerWrapper).toBeVisible()
  }).toPass()
})

/**
 * Number of links requested at the same time. Each request can take several seconds
 * behind a CDN, so checking links one by one exceeds the test timeout on a page with many links.
 */
const LINK_CHECK_CONCURRENCY = 10

/**
 * Verifies that the links on the homepage that point to the shop itself answer with a
 * status below 400. A failing request fails the test, there is no fallback to opening
 * the link in a browser tab. Links to other sites are not requested, because their
 * availability is outside the shop's control.
 */
test('C2141228 C2138940 C2138941 C2138942 C2143604 Verify Homepage links', async ({
  page,
}) => {
  test.setTimeout(60000)
  const shopOrigin = new URL(page.url()).origin
  const linkUrls = [...(await getAllLinksFromPage(page))].filter(
    (url) => new URL(url).origin === shopOrigin,
  )

  test.skip(
    linkUrls.length === 0,
    'No homepage link points to the shop itself - skipping test',
  )

  const checkLink = async (url: string) => {
    await test.step(`Checking link: ${url}`, async () => {
      // A network error must not reject the batch, or the links after it go unchecked.
      try {
        let response = await page.request.head(url)
        // Some servers answer HEAD with 405 for a page that a GET serves.
        if (response.status() === 405) {
          response = await page.request.get(url)
        }
        expect
          .soft(response.status(), `${url} answered with an error`)
          .toBeLessThan(400)
      } catch (error) {
        expect.soft(error, `${url} could not be requested`).toBeUndefined()
      }
    })
  }

  for (let i = 0; i < linkUrls.length; i += LINK_CHECK_CONCURRENCY) {
    await Promise.all(
      linkUrls.slice(i, i + LINK_CHECK_CONCURRENCY).map(checkLink),
    )
  }
})
