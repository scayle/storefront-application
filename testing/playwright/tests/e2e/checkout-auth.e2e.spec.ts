import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { ROUTES } from '../../support/constants'
import { authState } from '../../support/auth'
import {
  isProductSellableNow,
  isVariantBuyableNow,
} from '../../support/productTestHelpers'

/**
 * @file Verifies that a customer restored from the saved session (see `tests/auth.setup.ts`)
 * reaches the checkout signed in. The Checkout Web Component authenticates from the access
 * token the server reads from the session, so this covers the saved state for checkout flows.
 */

test.describe('Checkout from a saved session', () => {
  test.use(authState('default'))
  // The `afterEach` hook below empties the basket before the accessibility replay would open the
  // checkout, so the replay would scan an empty one.
  test.use({ a11yEnabled: false })

  // The basket belongs to the customer, not the session, so an item left behind would break later
  // tests of this browser that count basket items. Cleaning up in a hook keeps it running after a
  // failed or timed-out test, and it exits at once when the basket is empty.
  test.afterEach(async ({ page, basketPage }) => {
    test.setTimeout(test.info().timeout + 60_000)
    await page.goto(ROUTES.basket, {
      waitUntil: 'domcontentloaded',
    })
    await expect(async () => {
      const items = await basketPage.basketProductCard.count()
      if (items > 0) {
        await basketPage.removeItemFromBasket()
      }
      await expect(basketPage.basketProductCard).toHaveCount(0)
    }).toPass({ timeout: 60_000 })
  })

  test('Verify signed-in checkout starts without the sign-in form', async ({
    page,
    basketPage,
    checkoutPage,
    header,
    signinPage,
    countryDetector,
    storefrontAPIClient,
  }) => {
    test.setTimeout(90_000)

    await basketPage.navigate(page, ROUTES.home, 'networkidle')
    await countryDetector.closeModal()

    const product = await storefrontAPIClient.findProduct(
      (candidate) =>
        isProductSellableNow(candidate) &&
        (candidate.variants?.some(isVariantBuyableNow) ?? false),
    )
    const variant = product?.variants?.find(isVariantBuyableNow)
    test.skip(!variant, 'No product with a buyable variant found')

    await basketPage.addProductToBasket(variant!.id, 1)

    await page.goto(ROUTES.basket, {
      waitUntil: 'domcontentloaded',
    })
    // The basket and checkout render for a guest too, so only the account popover, which greets
    // the customer once `customer` has loaded, shows that the restored session is alive.
    await expect(header.userFlyoutGreetingFirstname).toBeAttached()
    await basketPage.basketProductCard.first().waitFor()
    await basketPage.checkoutButton.click()
    await expect(page).toHaveURL(new RegExp(`/${ROUTES.checkout}`))

    await expect(checkoutPage.basketContainer).toBeVisible({ timeout: 30_000 })
    await expect(signinPage.passwordlessUsePasswordButton).toBeHidden()
    await expect(signinPage.loginForm).toBeHidden()
  })
})
