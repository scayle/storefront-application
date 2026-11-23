import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'
import {
  requireNavigableMainCategory,
  getPlpHeadlineCategoryName,
  isMobile,
  navigationItemLabel,
} from '../../support/utils'

/**
 * @file Contains end-to-end tests for the main navigation, verifying its flyout
 * on desktop and mobile navigation, and the ability to navigate to Product
 * Listing Pages (PLPs) from the main navigation.
 */
test.beforeEach(async ({ homePage, countryDetector, page }) => {
  await homePage.navigate(page, ROUTES.home, 'networkidle')
  await page.waitForLoadState('domcontentloaded')
  await countryDetector.closeModal()
})

/**
 * - Verifies the main navigation flyout on desktop browsers.
 * - Verifies navigating to a main category PLP from the main navigation
 * and asserts the page title.
 * - Verifies navigating to a sub-category PLP from the main navigation
 * and asserts the page title on desktop.
 * - Verifies navigating to a 2nd level category PLP
 * and asserts the page title.
 */
test('C2130722 C2143633 C2143634 Verify Main Navigation Flyout and navigating to Main category PLP', async ({
  mainNavigation,
  mobileNavigation,
  page,
  breadcrumb,
  storefrontAPIClient,
}) => {
  const categoryId = await requireNavigableMainCategory(
    page,
    mobileNavigation,
    mainNavigation,
    storefrontAPIClient,
    { withSubCategories: true },
  )

  if (isMobile(page)) {
    await test.step('Mobile - navigate to 2nd category level', async () => {
      await mobileNavigation.openPlpMobile(categoryId)

      const mainCategoryLabel =
        (await breadcrumb.breadcrumbCategoryLvl0.textContent()) as string
      const activeCategoryName = await getPlpHeadlineCategoryName(
        breadcrumb.breadcrumbCategoryActive,
      )

      await expect(page.title()).resolves.toContain(
        `${activeCategoryName} - ${navigationItemLabel(mainCategoryLabel)} | `,
      )
    })
  } else {
    await test.step('Desktop - check navigation overlay', async () => {
      await mainNavigation.openMainNavigationOverlay(categoryId)
      await expect(mainNavigation.desktopNavigationFlyout).toBeVisible()
    })

    await test.step('Desktop - navigate to main category PLP', async () => {
      await mainNavigation.navigateToPlpMainCategory(categoryId)
      await breadcrumb.breadcrumbCategoryActive.waitFor()
      await page.mouse.move(0, 0)

      const activeCategoryName = await getPlpHeadlineCategoryName(
        breadcrumb.breadcrumbCategoryActive,
      )

      await expect(page.title()).resolves.toContain(`${activeCategoryName} | `)
    })

    await test.step('Desktop - navigate to sub-category PLP', async () => {
      await mainNavigation.navigateToPlpSubCategory(categoryId)

      const mainCategoryLabel =
        (await breadcrumb.breadcrumbCategoryLvl0.textContent()) as string
      const activeCategoryName = await getPlpHeadlineCategoryName(
        breadcrumb.breadcrumbCategoryActive,
      )

      await expect(page.title()).resolves.toContain(
        `${activeCategoryName} - ${navigationItemLabel(mainCategoryLabel)} | `,
      )
    })
  }
})
