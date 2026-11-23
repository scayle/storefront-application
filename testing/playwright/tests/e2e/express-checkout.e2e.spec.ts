import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { E2E_EXPRESS_CHECKOUT_ENABLED, ROUTES } from '../../support/constants'
import {
  findBuyableProductVariant,
  isE2eFeatureEnabled,
  seedBasketWithBuyableProduct,
} from '../../support/express-checkout-helpers'

/**
 * Express checkout scenarios for `<scayle-express-checkout>` on PDP and basket.
 *
 * Requires checkout web component script URL and payment provider configuration
 * in the target shop. Enable with `E2E_EXPRESS_CHECKOUT_ENABLED=true`.
 */
test.describe('Express checkout', () => {
  test.skip(
    !isE2eFeatureEnabled(E2E_EXPRESS_CHECKOUT_ENABLED),
    'Set E2E_EXPRESS_CHECKOUT_ENABLED=true when express checkout is configured in the test shop',
  )

  test('C2638906 PDP renders the express checkout web component on page load without a selected variant', async ({
    page,
    expressCheckout,
    productDetailPage,
    storefrontAPIClient,
    countryDetector,
  }) => {
    const match = await findBuyableProductVariant(storefrontAPIClient)
    test.skip(!match, 'No buyable product variant found in the test shop')

    await productDetailPage.navigate(
      page,
      `p/p-${match!.product.id}`,
      'networkidle',
    )
    await page.waitForLoadState('domcontentloaded')
    await page.keyboard.press('Escape')
    await countryDetector.closeModal()
    await productDetailPage.variantPicker.waitFor({ state: 'visible' })

    // The express checkout web component renders on page load, before any size
    // is chosen. No basket, JWT, or session is created until the customer/user acts.
    await expect(expressCheckout.expressCheckoutComponent).toBeAttached({
      timeout: 20_000,
    })
  })

  test('C2638907 Basket summary renders the express checkout web component with items', async ({
    page,
    basketPage,
    expressCheckout,
    storefrontAPIClient,
    countryDetector,
  }) => {
    const seeded = await seedBasketWithBuyableProduct(
      storefrontAPIClient,
      basketPage,
    )
    test.skip(!seeded, 'No buyable product variant found in the test shop')

    await basketPage.navigate(page, ROUTES.basket, 'networkidle')
    await countryDetector.closeModal()

    await expect(basketPage.basketProductCard.first()).toBeVisible()
    await expect(expressCheckout.expressCheckoutComponent).toBeAttached({
      timeout: 20_000,
    })
  })
})
