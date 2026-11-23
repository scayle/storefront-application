import { expect } from '@playwright/test'
import type { APIResponse } from '@playwright/test'
import { test } from '../../fixtures/fixtures'
import { createStorefrontAPIClient } from '../../support/storefrontAPIClient'
import { ROUTES } from '../../support/constants'
import { authState } from '../../support/auth'
import { skipForCatalogGap } from '../../support/productTestHelpers'
import {
  getHomepageUrl,
  getShopPath,
  skipUnlessStatusCodeProject,
} from '../../support/utils'

/**
 * @file Verifies the redirects the storefront answers with a status code and a `Location`
 * header: country, trailing slash, canonical slugs and the sign-in redirect. The status code
 * checks use the `request` fixture with `maxRedirects: 0`, so they see the first response
 * instead of the page the browser would land on.
 */

const DO_NOT_FOLLOW = { maxRedirects: 0 } as const

/**
 * Reads where a redirect response points.
 *
 * @param response A response with a `Location` header.
 * @returns The target as an absolute URL, resolved against the URL that was requested.
 */
function redirectTarget(response: APIResponse): URL {
  const location = response.headers().location
  expect(location, 'The response has a Location header').toBeTruthy()
  return new URL(location, response.url())
}

test.describe('Redirect status codes', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessStatusCodeProject(testInfo)
  })

  /**
   * Verifies that the shop URL without a country prefix redirects to the homepage of the
   * default country. Skips when the shop serves its default country at the root.
   */
  test('C2661279: Verify Root URL redirects to the default country', async ({
    request,
    baseURL,
  }) => {
    const { origin } = new URL(getHomepageUrl(baseURL))

    const rootResponse = await request.get(`${origin}/`, DO_NOT_FOLLOW)
    test.skip(
      rootResponse.status() === 200,
      'The shop serves the default country at its root, so there is no redirect to check',
    )

    await test.step('The root URL answers with a redirect to a country', () => {
      expect(rootResponse.status()).toBe(302)
      expect(redirectTarget(rootResponse).origin).toBe(origin)
    })

    await test.step('The target is the default country', async () => {
      // The Inertia JSON of the target page tells which country answered.
      const targetResponse = await request.get(
        redirectTarget(rootResponse).href,
        { headers: { 'X-Inertia': 'true' } },
      )
      expect(targetResponse.ok()).toBe(true)
      const page = (await targetResponse.json()) as {
        props: { storefront: { country: { isDefault?: boolean } } }
      }
      // A shop with the `path` selector does not need a country flagged as default. The root
      // then redirects to the first country, and there is no flag to compare with.
      test.skip(
        page.props.storefront.country.isDefault === undefined,
        'The shop config flags no country as default, so the target cannot be compared - skipping test',
      )
      expect(page.props.storefront.country.isDefault).toBe(true)
    })
  })

  /**
   * Verifies that the Basket URL with a trailing slash redirects to the URL without it,
   * and keeps the country prefix.
   */
  test('C2661280: Verify Basket URL with trailing slash redirects to the URL without it', async ({
    request,
    baseURL,
  }) => {
    const response = await request.get(`${ROUTES.basket}/`, DO_NOT_FOLLOW)

    expect(response.status()).toBe(301)
    // `getHomepageUrl` keeps the slash of a bare origin, so strip it before adding the route.
    expect(redirectTarget(response).href).toBe(
      `${getHomepageUrl(baseURL).replace(/\/$/, '')}/${ROUTES.basket}`,
    )
  })

  /**
   * Verifies that a PDP URL with a wrong slug redirects to the canonical URL of the same
   * product and keeps the query string.
   * The product ID comes from the Storefront API, and the wrong slug keeps that ID.
   */
  test('C2661281: Verify PDP URL with a wrong slug redirects to the canonical URL', async ({
    request,
    baseURL,
    storefrontAPIClient,
    nonDefaultCountryLookup,
  }) => {
    const product = await storefrontAPIClient.findProduct(
      (candidate) => candidate.isActive,
    )
    skipForCatalogGap('C2661281', !product, 'No active product found')
    const productId = product!.id

    const response = await request.get(
      `p/wrong-name-${productId}?foo=1`,
      DO_NOT_FOLLOW,
    )

    expect(response.status()).toBe(301)
    const target = redirectTarget(response)
    expect(target.pathname).toMatch(
      new RegExp(`^${getShopPath(baseURL)}/p/[^/]+-${productId}$`),
    )
    expect(target.pathname).not.toContain('wrong-name')
    expect(target.searchParams.get('foo')).toBe('1')

    await test.step('The canonical URL loads', async () => {
      const canonical = await request.get(target.href, DO_NOT_FOLLOW)
      expect(canonical.status()).toBe(200)
    })

    await test.step('A non-default country keeps its prefix', async () => {
      if (!nonDefaultCountryLookup) {
        test.info().annotations.push({
          type: 'catalog-gap',
          description: 'The shop has only the default country, step skipped',
        })
        return
      }

      // The product comes from the catalog of that country, which can differ.
      const countryProduct = await createStorefrontAPIClient(
        nonDefaultCountryLookup.shopId,
      ).findProduct((candidate) => candidate.isActive)
      // A gap here must not skip the whole test, the steps above already passed.
      if (!countryProduct) {
        test.info().annotations.push({
          type: 'catalog-gap',
          description:
            'No active product found in the non-default country, step skipped',
        })
        return
      }
      const countryProductId = countryProduct.id

      const countryResponse = await request.get(
        `${nonDefaultCountryLookup.url}/p/wrong-name-${countryProductId}?foo=1`,
        DO_NOT_FOLLOW,
      )

      expect(countryResponse.status()).toBe(301)
      const countryTarget = redirectTarget(countryResponse)
      expect(countryTarget.pathname).toMatch(
        new RegExp(
          `^${nonDefaultCountryLookup.path}/p/[^/]+-${countryProductId}$`,
        ),
      )
      expect(countryTarget.searchParams.get('foo')).toBe('1')
    })
  })

  /**
   * Verifies that a PLP URL with a wrong slug redirects to the canonical URL of the same
   * category and keeps the query string.
   * The category ID comes from the Storefront API, and the wrong slug keeps that ID.
   */
  test('C2661282: Verify PLP URL with a wrong slug redirects to the canonical URL', async ({
    request,
    baseURL,
    storefrontAPIClient,
  }) => {
    const category = await storefrontAPIClient.findCategoryWithProducts(1)
    skipForCatalogGap('C2661282', !category, 'No category with products found')
    const categoryId = category!.id

    const response = await request.get(
      `c/wrong-name-${categoryId}?foo=1`,
      DO_NOT_FOLLOW,
    )

    expect(response.status()).toBe(301)
    const target = redirectTarget(response)
    expect(target.pathname).toMatch(
      new RegExp(`^${getShopPath(baseURL)}/c/.+-${categoryId}$`),
    )
    expect(target.pathname).not.toContain('wrong-name')
    expect(target.searchParams.get('foo')).toBe('1')

    await test.step('The canonical URL loads', async () => {
      const canonical = await request.get(target.href, DO_NOT_FOLLOW)
      expect(canonical.status()).toBe(200)
    })
  })

  /**
   * Verifies that a guest who opens the Orders page is redirected to the sign-in page,
   * and that the redirect URL points back to the Orders page of the same country.
   */
  test('C2661283: Verify Orders page redirects guests to sign-in with redirect URL', async ({
    request,
    baseURL,
  }) => {
    const shopPath = getShopPath(baseURL)

    const response = await request.get(
      `${ROUTES.account}/${ROUTES.orders}`,
      DO_NOT_FOLLOW,
    )

    expect(response.status()).toBe(302)
    const target = redirectTarget(response)
    expect(target.pathname).toBe(`${shopPath}/${ROUTES.signin}`)
    expect(target.searchParams.get('redirectUrl')).toBe(
      `${shopPath}/${ROUTES.account}/${ROUTES.orders}`,
    )
  })
})

test.describe('Sign-in redirect URL of a signed-in customer', () => {
  test.use(authState('default'))

  test.beforeEach(({}, testInfo) => {
    skipUnlessStatusCodeProject(testInfo)
  })

  /**
   * Verifies that a signed-in customer who opens the sign-in page with an external redirect
   * URL stays on the shop. The request does not follow the redirect, so a regression of the
   * guard fails on the `Location` header and never sends a browser to the external host.
   * Needs the default test customer from the saved session (see `tests/auth.setup.ts`).
   */
  test('C2661284: Verify Sign-in page keeps a logged-in customer on the shop for an external redirect URL', async ({
    page,
    baseURL,
  }) => {
    // `page.request` shares the cookies of the signed-in page context.
    const response = await page.request.get(
      `${ROUTES.signin}?redirectUrl=//evil.com`,
      DO_NOT_FOLLOW,
    )

    expect(response.status()).toBe(302)
    const target = redirectTarget(response)
    expect(target.origin).toBe(new URL(getHomepageUrl(baseURL)).origin)
    expect(target.pathname).toBe(
      `${getShopPath(baseURL)}/${ROUTES.account}/${ROUTES.orders}`,
    )
  })
})
