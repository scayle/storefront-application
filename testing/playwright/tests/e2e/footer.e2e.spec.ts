import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'
import { getHomepageUrl } from '../../support/utils'

/**
 * @file Contains end-to-end tests for the website footer, specifically
 * verifying the functionality of the footer logo.
 */

test.beforeEach(async ({ footer, countryDetector, page }) => {
  await footer.navigate(page, ROUTES.home, 'networkidle')
  await countryDetector.closeModal()
  await footer.footerWrapper.scrollIntoViewIfNeeded()
})

/**
 * Verifies that clicking the footer logo from the homepage
 * keeps the user on the homepage and scrolls them back to the top of the page.
 * It also verifies that clicking the footer logo from a non-homepage
 * (e.g., the basket page) navigates the user back to the default homepage.
 */
test('C2143605 Verify footer logo', async ({
  footer,
  page,
  baseURL,
  header,
  countryDetector,
}) => {
  await test.step('Verify logo click from Homepage', async () => {
    await expect(footer.footerLogo).toBeVisible()
    const pageUrl = page.url()

    await footer.footerLogo.click({ force: true })
    expect(page.url()).toEqual(pageUrl)
    await page.waitForFunction(
      () =>
        new Promise((resolve) =>
          window.addEventListener('scrollend', resolve, { once: true }),
        ),
    )

    await expect(header.mainHeader).toBeInViewport()

    const scrollPosition = await page.evaluate(() => window.scrollY)
    expect(scrollPosition).toBe(0)
  })

  await test.step('Verify logo click from non-Homepage', async () => {
    await footer.navigate(page, ROUTES.basket, 'networkidle')
    await countryDetector.closeModal()
    await expect(footer.footerLogo).toBeVisible()
    await footer.footerLogo.click()
    await page.waitForURL(getHomepageUrl(baseURL))
    await expect(header.mainHeader).toBeInViewport()
    expect(page.url()).toEqual(getHomepageUrl(baseURL))
  })
})
