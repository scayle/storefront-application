import { expect } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { skipForCatalogGap } from '../../support/productTestHelpers'

/**
 * Verifies that no active promotion lists a category the Storefront API no longer knows.
 * Promotions keep pointing at a category after it is deleted, for example when the catalog
 * is replaced, and a promotion whose condition lists only deleted categories applies to no
 * product. The failure names the promotions and category IDs, so it reads as a tenant data
 * problem that someone fixes in the Panel, not as a defect of the Storefront Application.
 * It also fails when a condition mentions categories in a format the check cannot read, so a
 * change in the condition text does not turn it into a check that looks at nothing.
 *
 * Not checked here, and left for a follow-up: the link of a promotion. It comes from the
 * promotion's own Panel field (`customData.link`) and can point at a deleted category while the
 * conditions are fine, which was the original defect on this tenant. The reasons of skipped
 * tests are not part of this check either.
 *
 * It reads the first 10 active promotions, like the promotion ribbon and flyout of the Storefront
 * Application.
 *
 * The answer does not depend on the browser, so only chromium runs it.
 */
test('Tenant data: active promotions only list existing categories', async ({
  storefrontAPIClient,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'The promotion conditions do not depend on the browser, so only chromium checks them',
  )

  const promotions = await storefrontAPIClient.getActivePromotions()
  skipForCatalogGap(
    'Tenant data',
    promotions.length === 0,
    'No active promotion on this shop.',
  )

  const promotionsWithMissingCategories: string[] = []
  const unreadConditions: string[] = []
  let checkedCategoryCount = 0
  for (const promotion of promotions) {
    for (const condition of storefrontAPIClient.findUnreadCategoryConditions(
      promotion,
    )) {
      unreadConditions.push(`${promotion.name} (${promotion.id}): ${condition}`)
    }
    const categoryIds = storefrontAPIClient.getPromotionCategoryIds(promotion)
    checkedCategoryCount += categoryIds.length
    const missingCategoryIds =
      await storefrontAPIClient.findMissingCategoryIds(categoryIds)
    if (missingCategoryIds.length > 0) {
      promotionsWithMissingCategories.push(
        `${promotion.name} (${promotion.id}): ${missingCategoryIds.join(', ')}`,
      )
    }
  }

  expect(
    unreadConditions,
    'Promotion conditions mention categories in a format this check cannot read. Check the Panel or update getPromotionCategoryIds',
  ).toEqual([])

  // Every condition that mentions categories was read, so no ID here means no promotion
  // targets a category.
  skipForCatalogGap(
    'Tenant data',
    checkedCategoryCount === 0,
    'No active promotion lists a category, so there is nothing to check.',
  )

  expect(
    promotionsWithMissingCategories,
    'Tenant data problem: active promotions list categories that no longer exist',
  ).toEqual([])
})
