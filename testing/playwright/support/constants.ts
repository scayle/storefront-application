/**
 * Predefined filter parameters for testing PLP deep links.
 * Currently configured with "maxPrice": 10000 (minor units) for testing purposes.
 * This object is used in "C2139744: Verify PLP Filters deep-link" and
 * "C2139182: Verify PLP SEO data" within `tests/e2e/plp.e2e.spec.ts`. The
 * deep-link test adds a color read from the filter dialog, so it expects one
 * more active filter than this object holds.
 *
 * Do not add a "sale" filter here: the shop's computed sale filter can match no
 * product, and a boolean filter without matching products is not rendered. The
 * sale deep link has its own constant and its own test.
 */
export const PLP_FILTER_DEEP_LINK = {
  maxPrice: 10000,
}

/**
 * Filter parameters for "Verify PLP Filters deep-link with the sale filter" within
 * `tests/e2e/plp.e2e.spec.ts`. The test needs a category whose `sale` filter matches
 * at least one product and skips otherwise.
 */
export const PLP_SALE_FILTER_DEEP_LINK = {
  sale: true,
}

export const BASKET_TEST_DATA = {
  seoRobots: 'noindex, nofollow',
}

/**
 * `CUSTOMER_ACCOUNT` constant object contains keys needed to verify customer data update, password update with non-matching password,
 * and birth date update with an incorrect date.
 * In order to successfully use this constant object in end-to-end tests, test customers should be defined via environment variables,
 * as explained in `TEST_CUSTOMERS` object.
 */
export const CUSTOMER_ACCOUNT = {
  firstName: 'Aqa',
  lastName: 'Test',
  birthDateIncorrect: '1899-01-01',
  nonMatchingPassword: 'N0nMatch1ngPa55w0rd!',
  routeOrders: 'account/orders',
  routeSubscriptions: 'account/subscriptions',
  routeProfile: 'account/profile',
}

export const PDP_E2E = {
  seoRobots: 'index, follow',
}

/**
 * `localStorage` key the Checkout Auth SDK writes the access token to once a customer is signed in.
 * It mirrors `CHECKOUT_AUTH_STORAGE_KEYS` in `@scayle/storefront`,
 * which this test package does not depend on.
 */
export const CHECKOUT_ACCESS_TOKEN_KEY = 'scayle:auth:accessToken'

/**
 * A constant object defining various test customers needed for different browsers and scenarios in end-to-end tests.
 */
export const TEST_CUSTOMERS = {
  /**
   * Dedicated test customer for Chromium in tests that are prone to conflicts (e.g. adding product to Basket in parallel for all browsers).
   * This customer is also used as the default test customer across the Storefront Application end-to-end tests suite.
   */
  testCustomerEmail1: process.env.TEST_CUSTOMER_EMAIL1 as string,
  /** Dedicated test customer for desktop Firefox. */
  testCustomerEmail2: process.env.TEST_CUSTOMER_EMAIL2 as string,
  /** Dedicated test customer for desktop Webkit (Safari) */
  testCustomerEmail3: process.env.TEST_CUSTOMER_EMAIL3 as string,
  /** Dedicated test customer for mobile Chrome */
  testCustomerEmail4: process.env.TEST_CUSTOMER_EMAIL4 as string,
  /** Dedicated test customer for mobile Webkit (Safari) */
  testCustomerEmail5: process.env.TEST_CUSTOMER_EMAIL5 as string,
  /** Test customer with no orders placed. Used to verify Orders page empty state. */
  testCustomerNoOrders: process.env.TEST_CUSTOMER_NO_ORDERS as string,
  /**
   * Test customer used to verify hydration errors for signed-in customers on pages with items (Wishlist and Basket).
   * This test customer should have items in Wishlist and Basket, so the non-empty state is tested properly.
   */
  testCustomerEmail6: process.env.TEST_CUSTOMER_EMAIL6 as string,
  /** Password (the same for all test customers listed above). */
  testCustomerPassword: process.env.TEST_CUSTOMER_PASSWORD as string,
  /** Deliberately incorrect password, used only in negative login tests. */
  wrongPassword: process.env.TEST_CUSTOMER_WRONG_PASSWORD as string,
  /** First and last name typed into the registration form, e.g. when registering an already registered email. */
  registrationFirstName: 'Registered',
  registrationLastName: 'User',
  /** Non registered e-mail address. Used in non-happy paths for some tests, e.g. password reset for non-registered user. */
  nonExistingEmail: 'Aqa.testxx@test.com',
  /** Wrong formatted e-mail address. Used in non-happy paths for some tests, e.g. password reset for invalid e-mail format. */
  emailInvalidFormat: 'test@test',
}

/**
 * Supported sorting options for product listings, mapped to their backend identifiers.
 */
export const SORTING = {
  topSeller: 'top_seller',
  dateNewest: 'date_newest',
  priceDesc: 'price_desc',
  priceAsc: 'price_asc',
  reductionDesc: 'reduction_desc',
}

/**
 * Commonly used application routes for navigation and testing. The values are relative to the
 * country-scoped `baseURL`, so passing one to `page.goto` resolves it under the country prefix
 * of `BASE_URL`. A URL assertion that needs the leading slash writes `/${ROUTES.basket}`.
 */
export const ROUTES = {
  /** The country homepage, which is the `baseURL` itself. */
  home: './',
  wishlist: 'wishlist',
  basket: 'basket',
  orders: 'orders',
  checkout: 'checkout',
  signin: 'signin',
  account: 'account',
}

/** Set to `true` to enable express checkout E2E assertions on PDP and basket. */
export const E2E_EXPRESS_CHECKOUT_ENABLED =
  process.env.E2E_EXPRESS_CHECKOUT_ENABLED

/**
 * A navigation synonym that the Storefront API resolves to a navigation item with an external
 * `https` link. The external search link tests use it, and the default is the synonym of the
 * SCAYLE QA shop. Change it to a synonym of your shop, see SETUP.md. The tests skip when the
 * Storefront API does not resolve the term to an external URL.
 */
export const EXTERNAL_SEARCH_TERM = 'scayle-external-test'

/**
 * Test data for OSP (Order Success Page) scenarios, including SEO and URL parameters.
 */
export const OSP_TEST_DATA = {
  incorrectCbdUrl:
    'success?cbd=eyJzdGF0dXNTg1NTI3Y2I3NjY0NWQ3NA==&login=1&pmm=b2b',
  seoRobots: 'noindex, nofollow',
}

/**
 * Test data for login and registration flows, including SEO and URL parameters.
 */
export const LOGIN_REGISTRATION = {
  seoRobots: 'noindex,follow',
  regUrlParam: 'register=true',
}

/**
 * Product Listing Page (PLP) test data for SEO robots meta tag scenarios.
 */
export const PLP_TEST_DATA = {
  seoRobotsDefault: 'index, follow',
  seoRobotsFiltersSorting: 'noindex, follow',
}

/**
 * Wishlist page test data for SEO validation.
 */
export const WISHLIST_TEST_DATA = {
  seoRobots: 'noindex, nofollow',
}

/**
 * Regular expression to match and remove any characters that are not
 * digits (0-9), periods (.), or hyphens (-). Useful for parsing numeric values like prices.
 */
export const NON_NUMERIC_PRICE_CHARS_REGEX = /[^0-9.-]+/g

export const TEST_PASSWORD_RESET_HASH = '?hash=testhash'
