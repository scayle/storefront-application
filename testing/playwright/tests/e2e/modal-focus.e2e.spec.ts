import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'

/**
 * Smoke tests for native `<dialog>` focus behavior in SFModal and SFSlideIn.
 *
 * Two guards:
 * - Focus restoration on close: `useReturnFocus` restores the trigger after
 *   `v-dialog` closes the native dialog when the leave transition finishes.
 *   Browsers may auto-restore focus at different times relative to that close.
 *   These tests guard trigger focus on engines where timing differs from
 *   Chromium.
 * - Initial focus delegate: the panel carries `tabindex="-1"` + `autofocus` so
 *   `showModal()` does not auto-focus the close button (which would otherwise
 *   match `:focus-visible` and show a ring on open).
 */
const FOCUS_SMOKE_PROJECTS = ['firefox', 'webkit']

test.beforeEach(({}, testInfo) => {
  test.skip(
    !FOCUS_SMOKE_PROJECTS.includes(testInfo.project.name),
    'Modal focus smoke tests run on Firefox and Safari only',
  )
})

test.describe('SFModal focus restoration', () => {
  test('returns focus to gallery after closing zoom with Escape', async ({
    productDetailPage,
    countryDetector,
    page,
    storefrontAPIClient,
  }) => {
    const productData = await storefrontAPIClient.findProduct(
      (product) =>
        product.isActive &&
        (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
          false) &&
        Array.isArray(product.images) &&
        product.images.length >= 2,
    )

    test.skip(!productData, 'No active in-stock product with images found')

    await productDetailPage.navigate(
      page,
      `p/p-${productData!.id}`,
      'networkidle',
    )
    await countryDetector.closeModal()
    await page.keyboard.press('Escape')
    await productDetailPage.productGallery.waitFor()

    // The zoom opens from a grid tile (the mobile slider is `sm:hidden` on the
    // 1280px desktop projects these smoke tests run on). Closing must restore
    // focus to the tile that opened it.
    const tile = productDetailPage.getProductGridTile(0)

    await tile.focus()
    await expect(tile).toBeFocused()

    await tile.press('Enter')
    await expect(page.locator('dialog[open]')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect(tile).toBeFocused()
  })

  test('returns focus to gallery after closing zoom with the close button', async ({
    productDetailPage,
    countryDetector,
    page,
    storefrontAPIClient,
  }) => {
    const productData = await storefrontAPIClient.findProduct(
      (product) =>
        product.isActive &&
        (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
          false) &&
        Array.isArray(product.images) &&
        product.images.length >= 2,
    )

    test.skip(!productData, 'No active in-stock product with images found')

    await productDetailPage.navigate(
      page,
      `p/p-${productData!.id}`,
      'networkidle',
    )
    await countryDetector.closeModal()
    await page.keyboard.press('Escape')
    await productDetailPage.productGallery.waitFor()

    // The zoom opens from a grid tile (the mobile slider is `sm:hidden` on the
    // 1280px desktop projects these smoke tests run on). Closing must restore
    // focus to the tile that opened it.
    const tile = productDetailPage.getProductGridTile(0)

    await tile.focus()
    await expect(tile).toBeFocused()

    await tile.press('Enter')
    await expect(page.locator('dialog[open]')).toBeVisible()

    await productDetailPage.imageGalleryOverlayCloseButton.click()
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect(tile).toBeFocused()
  })

  test('does not auto-focus the close button when the zoom modal opens', async ({
    productDetailPage,
    countryDetector,
    page,
    storefrontAPIClient,
  }) => {
    const productData = await storefrontAPIClient.findProduct(
      (product) =>
        product.isActive &&
        (product.variants?.some((variant) => variant.stock?.quantity > 0) ??
          false) &&
        Array.isArray(product.images) &&
        product.images.length >= 2,
    )

    test.skip(!productData, 'No active in-stock product with images found')

    await productDetailPage.navigate(
      page,
      `p/p-${productData!.id}`,
      'networkidle',
    )
    await countryDetector.closeModal()
    await page.keyboard.press('Escape')
    await productDetailPage.productGallery.waitFor()

    // The zoom opens from a grid tile (the mobile slider is `sm:hidden` on the
    // 1280px desktop projects these smoke tests run on). Closing must restore
    // focus to the tile that opened it.
    const tile = productDetailPage.getProductGridTile(0)

    await tile.focus()
    await tile.press('Enter')
    await expect(page.locator('dialog[open]')).toBeVisible()

    // The panel is the focus delegate, so the close button must not be focused
    // on open (otherwise it would render a spurious :focus-visible ring).
    await expect(
      productDetailPage.imageGalleryOverlayCloseButton,
    ).not.toBeFocused()

    // The native focus trap is intact: Tab still reaches the close button.
    await page.keyboard.press('Tab')
    await expect(productDetailPage.imageGalleryOverlayCloseButton).toBeFocused()
  })
})

test.describe('SFSlideIn focus behavior', () => {
  test('returns focus to the filter trigger after closing the flyout', async ({
    productListingPage,
    filters,
    countryDetector,
    page,
    storefrontAPIClient,
  }) => {
    const category = await storefrontAPIClient.findCategoryWithProducts(1)

    test.skip(!category, 'No category found with products')

    const categoryPath = storefrontAPIClient.getCategoryPath(category!)

    await productListingPage.navigate(page, categoryPath, 'networkidle')
    await countryDetector.closeModal()

    const trigger = filters.buttonOpenFilters
    await trigger.focus()
    await expect(trigger).toBeFocused()

    // Activate via keyboard so the trigger is the active element on open
    // (Firefox/WebKit do not focus buttons on click).
    await trigger.press('Enter')
    await expect(page.locator('dialog[open]')).toBeVisible()

    // The close button must not be auto-focused on open.
    await expect(filters.closeFiltersButton).not.toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})
