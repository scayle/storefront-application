# Set up the Playwright suite for your shop

You can run the Storefront Application V3 Playwright suite against your own shop once you have set four things up: the suite's dependencies, a `.env` file, a set of test customers, and enough catalog data for the tests to find. This guide walks through each one in order. The [README](./README.md) covers how the suite is structured and how to write tests.

The suite drives a running storefront in a browser. It does not start your application, and it does not create customers, orders, or catalog data for you.

## Before you start

You need:

- Node 26 (or Node 24) and pnpm. The application README lists the exact versions under [Prerequisites](../../README.md#prerequisites).
- A storefront that is running and reachable from the machine that runs the tests, either a deployed environment or a local `pnpm dev` server. A local server also needs Redis for sessions. It reads `SCAYLE_KV_HOST` and `SCAYLE_KV_PORT` and defaults to `localhost:6379`. Set `STOREFRONT_KV_DISABLE_CLUSTER_MODE=true` when that Redis is a single instance rather than a cluster.
- The Storefront API key of your shop, the same value as `STOREFRONT_API_KEY` in your application's `.env`.
- Access to your shop's sign-in page, so you can register test customers.
- Optional: access to the SCAYLE Panel, so you can schedule a promotion for the promotion tests.
- Optional: a shop that sells in at least two countries. With a single country, the tests that switch to another shop and the search tests for a non-default country skip.

Use a test or staging shop. The tests add products to baskets and change customer data. The account tests rewrite the default customer's name, gender, and birth date, and the password reset test sends a real reset email to `TEST_CUSTOMER_EMAIL1`. Register that customer with a mailbox you control.

## Install the suite

The suite is its own pnpm package in `testing/playwright/`. It resolves its dependencies through the pnpm workspace of your repository, so the workspace has to list it before an install picks it up. Depending on how your project was created, that workspace may not be set up for it yet. Check these three things first:

- If your repository has no `pnpm-workspace.yaml`, create one at the application root. If it has one that does not list `testing/playwright` under `packages`, add it.
- If `testing/playwright/package.json` still has `workspace:*` for `@scayle/storefront-api`, replace it with the published version your application uses. The value `workspace:*` only resolves inside a workspace that contains that package.
- If your workspace has no catalog `app`, define `@orpc/client` and `@orpc/server` in it, because the suite references them as `catalog:app`. Use the versions your application pins for those two packages.

A workspace file that covers the first and third check looks like this:

```yaml
# File: pnpm-workspace.yaml
packages:
  - .
  - testing/playwright

catalogs:
  app:
    '@orpc/client': <version your application uses>
    '@orpc/server': <version your application uses>
```

Then install the dependencies from the application root, because `pnpm install` installs the whole workspace wherever you run it. Install the browsers from the suite's folder:

```bash
pnpm install
cd testing/playwright
pnpm exec playwright install
```

On a bare Linux machine or runner, use `pnpm exec playwright install --with-deps` instead, so the system libraries the browsers need are installed too. This needs root rights or `sudo`.

If you already ran an install before these checks, remove `node_modules` in `testing/playwright/` and install again.

## Configure your `.env` file

The suite reads variables from two files: the `.env` file in `testing/playwright/`, then the `.env` file in your application's root directory, two levels above it. Copy `testing/playwright/.env.example` to `testing/playwright/.env` and fill in the variables you need. A key that `testing/playwright/.env` defines wins over the application's `.env`, even when its value is empty: `KEY=` resolves to an empty string rather than falling through. Delete a line you don't want to set there, so the application's value applies instead. A variable exported in your shell wins over both files. When the `CI` environment variable is set, the suite skips both files and expects the variables in the process environment, as in a pipeline.

`STOREFRONT_TENANT_SPACE` and `STOREFRONT_API_KEY` come from your application's `.env`: when the Storefront CLI creates that file, it fills in the tenant space and asks for the API key. `testing/playwright/.env.example` holds the suite's own variables, `BASE_URL`, `E2E_SHOP_ID`, `E2E_EXPRESS_CHECKOUT_ENABLED`, the `TEST_CUSTOMER_*` keys, and the optional `E2E_RPC_TIMEOUT_MS` and `A11Y` settings. All of them are empty until you fill them in.

| Variable                           | Required | What it does                                                                                                                                                                                                 |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BASE_URL`                         | No       | The homepage of the shop under test: origin plus country prefix, with a trailing slash, for example `https://localhost:3000/de/`. Takes no query string or hash. Falls back to `https://localhost:3000/de/`. |
| `STOREFRONT_TENANT_SPACE`          | Yes      | The space identifier of your shop in SCAYLE, the same value as `tenantSpace` in `storefront.config.ts`. The suite builds the Storefront API host from it.                                                    |
| `STOREFRONT_API_KEY`               | Yes      | Your application's own Storefront API key. The suite uses it to look up products, categories, promotions, and campaigns.                                                                                     |
| `TEST_CUSTOMER_EMAIL1` to `EMAIL6` | Yes      | Six test customer accounts. See [Create the test customers](#create-the-test-customers).                                                                                                                     |
| `TEST_CUSTOMER_NO_ORDERS`          | Yes      | A test customer with no orders.                                                                                                                                                                              |
| `TEST_CUSTOMER_PASSWORD`           | Yes      | The password shared by all test customers.                                                                                                                                                                   |
| `TEST_CUSTOMER_WRONG_PASSWORD`     | Yes      | Any value that is not a real password. Used only by the negative sign-in test.                                                                                                                               |
| `E2E_SHOP_ID`                      | No       | The shop country ID, as an integer. By default the suite reads it from the rendered page. Set it only if your storefront does not expose that data.                                                          |
| `E2E_EXPRESS_CHECKOUT_ENABLED`     | No       | Set to `true` to run the express checkout tests. They are skipped otherwise.                                                                                                                                 |
| `E2E_RPC_TIMEOUT_MS`               | No       | Timeout in milliseconds for one RPC request the tests send, such as adding a product to the basket. Defaults to 5000. Raise it when your API answers slowly.                                                 |
| `A11Y`                             | No       | Set to `1` to run the accessibility checks. See [Accessibility checks](#accessibility-checks).                                                                                                               |

A missing `STOREFRONT_TENANT_SPACE` or `STOREFRONT_API_KEY` fails every test that looks up catalog data, not just one. A missing customer variable skips the sign-in setup for that customer, and the tests that depend on it then fail. See [Troubleshooting](#troubleshooting).

## Create the test customers

You need seven customers: `TEST_CUSTOMER_EMAIL1` to `EMAIL6` and `TEST_CUSTOMER_NO_ORDERS`. Register them once in your shop through its own sign-in page. The suite never provisions them, and you do not need to recreate them unless they are removed from the shop.

Use one password for all of them. It needs at least eight characters, with at least one uppercase letter, one lowercase letter, one digit, and one special character. The form also allows at most 70 characters and no spaces. These are the application's registration form defaults, not necessarily your shop's policy. The SCAYLE Panel sets the real one per shop (`emailPassword.password`), so if your shop is stricter, use a password that meets it, or the registration is rejected.

The suite runs once for each browser project: `chromium`, `firefox`, `webkit`, `mobile-chrome`, and `mobile-safari`. Each browser project signs in as its own customer, so parallel runs do not clash on basket and wishlist state:

| Variable                  | Used by                                                                                             | State it needs                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `TEST_CUSTOMER_EMAIL1`    | `chromium`, and the customer every browser project uses for the orders, wishlist, and sign-in tests | More than 8 orders, an empty wishlist, and an empty basket.                                                                    |
| `TEST_CUSTOMER_EMAIL2`    | `firefox`                                                                                           | An empty basket.                                                                                                               |
| `TEST_CUSTOMER_EMAIL3`    | `webkit`                                                                                            | An empty basket.                                                                                                               |
| `TEST_CUSTOMER_EMAIL4`    | `mobile-chrome`                                                                                     | An empty basket.                                                                                                               |
| `TEST_CUSTOMER_EMAIL5`    | `mobile-safari`                                                                                     | An empty basket.                                                                                                               |
| `TEST_CUSTOMER_EMAIL6`    | The signed-in hydration tests, in every browser project                                             | Items in the wishlist and the basket, so the hydration checks cover the non-empty pages. The tests also pass with empty pages. |
| `TEST_CUSTOMER_NO_ORDERS` | The Orders page empty state test                                                                    | No orders.                                                                                                                     |

These details save you a failed run:

- The orders pagination test opens page 2 of the order list, so `TEST_CUSTOMER_EMAIL1` needs more than 8 orders. The test has no skip and fails with 8 or fewer. Place them through your shop's checkout. Orders that already exist on the account count.
- The add-to-basket test counts one item after sign-in, so a basket that already holds items fails it. The basket clearing test removes at most 20 items and fails when more remain. The wishlist test fails when `TEST_CUSTOMER_EMAIL1` has wishlist items, and the orders empty state test fails when `TEST_CUSTOMER_NO_ORDERS` has orders.
- Register the customers with the first name `Aqa`. The account flyout test asserts that the greeting contains it for the desktop customers, `TEST_CUSTOMER_EMAIL1` to `EMAIL3`.

## Prepare your shop data

The suite never hardcodes a product or category. A test asks the Storefront API for data that fits its scenario, then drives the UI with what it finds. How a test behaves when nothing fits depends on the group below. The skip-rate line at the end of a run shows how many tests found no data. Test IDs such as `C2130650` start each test title in the specs, so searching for one finds the test.

The lookups have a window. The suite reads at most 625 products (25 pages of 25), looks for categories only among your root categories and their direct children (the sale deep-link test looks three levels below the root), reads the first 10 promotions and the first page of campaigns, and tries at most 8 search suggestions. Data outside that window counts as missing, so a deep category or the 700th product does not satisfy a test.

### Tests that skip when the data is missing

These tests skip with a reason in the report. The search tests that look up a brand or a search term (C2130650, C2132124, C2140718), the three promotion tests (C2185235, C2185240, C2167321), the tenant data spec, the regular product basket test (C2167319), and the redirect and search tests that look up a product, a category, or a search term (C2661281, C2661282, C2661285, C2661286, C2663543, C2663544, C2663545) also log that reason as `[C…] <reason>` and add a `catalog-gap` annotation. The two tenant data checks log it as `[Tenant data] <reason>` and `[Basket prices] <reason>`. Step 3 of C2661281 only adds the annotation and keeps the test result. The reasons of these search tests and of the regular product basket test (C2167319) start with `Catalog gap:`. Add the data and the tests run.

| Data your shop needs                                                                                                                                                                                                                                                                                                  | Tests that use it                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A category with at least 1 product                                                                                                                                                                                                                                                                                    | The listing page tests (C2130723, C2130731, C2132074, C2139182, C2130730, C2349762, C2139181), the filter flyout focus test, the listing page hydration tests, and the listing page slug redirect test (C2661282)                                                              |
| A shop selector in the page. The storefront leaves it out when the current shop is the only shop                                                                                                                                                                                                                      | The shop selector tests (C2162469, C2162470, C2162471)                                                                                                                                                                                                                         |
| At least one other country in the shop selector flyout                                                                                                                                                                                                                                                                | The shop switch tests (C2162469, C2162471)                                                                                                                                                                                                                                     |
| A country other than the default country, in the country list of the homepage                                                                                                                                                                                                                                         | The non-default country search tests (C2661285, C2661286, C2663543, C2663544, C2663545), and step 3 of C2661281                                                                                                                                                                |
| A product in the non-default country whose reference key search resolves to a product                                                                                                                                                                                                                                 | The non-default country product search tests (C2661285, C2663543)                                                                                                                                                                                                              |
| A root category, or a direct child of one, in the non-default country whose name search resolves to a category                                                                                                                                                                                                        | The non-default country category search tests (C2661286, C2663544)                                                                                                                                                                                                             |
| A search term in the non-default country that opens the results page, not a product or a category                                                                                                                                                                                                                     | The non-default country results page test (C2663545)                                                                                                                                                                                                                           |
| An active product, and one in the non-default country for step 3                                                                                                                                                                                                                                                      | The product page slug redirect test (C2661281)                                                                                                                                                                                                                                 |
| A main navigation entry that links to a category with products. Two tests also need sub-categories: a flyout on desktop, and on mobile a sub-navigation with a second level                                                                                                                                           | The main navigation test (C2130722, C2143633, C2143634), the mobile back button test (C2130724), and every test that starts from a category through the navigation: the product page SEO test (C2141150), the checkout tests, the order success page tests, and the happy path |
| A product that is not sold out and inside its sellable timeframe                                                                                                                                                                                                                                                      | The product page hydration tests, as a guest and signed in                                                                                                                                                                                                                     |
| A category with at least 10 products                                                                                                                                                                                                                                                                                  | Filters (C2130727, C2139744, which also needs a color chip), items per row (C2349760), scroll to top (C2349761), and the SCAYLE Analytics filter test                                                                                                                          |
| A category with at least 15, 20, 50, or 100 products                                                                                                                                                                                                                                                                  | The image slider (15, C2139723), sorting (20, C2162411 and C2229455), and pagination (50 opens page 2, C2162468, and 100 opens page 3, C2130729). The listing shows 32 products per page                                                                                       |
| A subcategory with at least 1 product, directly below a root category                                                                                                                                                                                                                                                 | The listing page title and breadcrumb tests (C2130725, C2141756)                                                                                                                                                                                                               |
| At least one root category                                                                                                                                                                                                                                                                                            | The search by category name test (C2130721)                                                                                                                                                                                                                                    |
| A sellable product with a buyable variant: active, not sold out, inside its sellable timeframe, and a variant with stock or sellable without stock                                                                                                                                                                    | The basket tests (C2132198, C2167319, C2167320, C2162487, C2170821), the product page tests (C2141598, C2141595, C2181798, C2173504, C2349764), search by product ID (C2132173), the signed-in checkout test, and the express checkout tests. C2240762 needs two such products |
| An active product with a variant in stock                                                                                                                                                                                                                                                                             | The product page tests (C2141594, C2141476, C2184713, C2179230), the wishlist tests (C2141222, C2228716), and the gallery zoom tests. C2184713 needs a product name, and C2141222 needs a brand label, or it fails                                                             |
| An active product with at least 2 units in stock                                                                                                                                                                                                                                                                      | Search by product ID with several units (C2170825)                                                                                                                                                                                                                             |
| An active product with at least 2 units in stock and a brand label                                                                                                                                                                                                                                                    | The brand search test (C2140718), which searches by that brand                                                                                                                                                                                                                 |
| A search term that opens the results page: a word of an active product name that search does not send to a category, a product or a navigation item, and that matches a sellable product                                                                                                                              | The search tests C2130650 and C2132124, and the results page test for a non-default country (C2663545)                                                                                                                                                                         |
| A product with several variants                                                                                                                                                                                                                                                                                       | C2141595, C2181798, C2173504, C2141597, and C2179230 (the last one asserts product data markup for every variant)                                                                                                                                                              |
| A product with exactly one variant that you can buy                                                                                                                                                                                                                                                                   | C2141596 and C2181801. The suite takes the first active single-variant product, so a sold-out one fails on add to basket                                                                                                                                                       |
| An active product with more than one sibling product                                                                                                                                                                                                                                                                  | The product page sibling test (C2266540). On the listing page (C2132074) the product must be on the first page of the category                                                                                                                                                 |
| An active product with 8 to 10 images                                                                                                                                                                                                                                                                                 | The product picture grid (C2139792) and the product gallery (C2139793, which also needs stock)                                                                                                                                                                                 |
| A product with 2 or more images on the first page of a category with 15 or more products                                                                                                                                                                                                                              | The listing image slider (C2139723). The gallery zoom tests need an active product in stock with 2 or more images                                                                                                                                                              |
| A sellable product with a sold-out variant that has a `size` attribute label, next to a buyable variant                                                                                                                                                                                                               | The size picker test (C2181799)                                                                                                                                                                                                                                                |
| A buyable variant with exactly 1 or 2 units in stock, on a sellable product                                                                                                                                                                                                                                           | The low stock test (C2638771)                                                                                                                                                                                                                                                  |
| A variant with more than 2 and fewer than 10 units in stock                                                                                                                                                                                                                                                           | The basket quantity test (C2162487)                                                                                                                                                                                                                                            |
| A variant with more than 10 units in stock                                                                                                                                                                                                                                                                            | The quantity selector (C2141597) and the basket limit test (C2170821, which expects at most 10 per basket line)                                                                                                                                                                |
| A buyable product with a `sale` reduction                                                                                                                                                                                                                                                                             | The sale product basket test (C2167320). A campaign reduction alone does not count                                                                                                                                                                                             |
| A sellable product without reductions in the Storefront API, with a buyable variant. The test adds the first one and checks the arithmetic of whatever the basket shows. When the basket shows a discount for it, the test adds an `api-basket-price-mismatch` annotation and the tenant data spec reports the prices | The regular product basket test (C2167319)                                                                                                                                                                                                                                     |
| A buyable product with a `sale` or `campaign` reduction                                                                                                                                                                                                                                                               | The product price details test (C2638900)                                                                                                                                                                                                                                      |
| A product in a category path at least 3 levels deep, with stock                                                                                                                                                                                                                                                       | The desktop product page breadcrumb test (C2139794). When the product is not on the first page of the category it links to, the test opens its page directly instead of through the listing                                                                                    |
| A subscription-eligible product, with a `subscriptionEligibility` attribute and subscription intervals                                                                                                                                                                                                                | The subscription test (C2141599). Without intervals it skips after it has already filled the basket. The product page shows the subscription block only when `STOREFRONT_COUNTRIES_<COUNTRY>_SUBSCRIPTION_ENABLED` is `true` for the country under test                        |
| A search term whose suggestions return category filter tags, and a product with a reference key of 3 or more characters that resolves. Both lookups consider only active products with a variant of at least 2 units                                                                                                  | The suggestion filter tags test (C2162007) and the reference key test (C2171031)                                                                                                                                                                                               |
| A variant with exactly 2 units, a variant with at least 3 units, and a product with 2 or more buyable sizes                                                                                                                                                                                                           | The SCAYLE Analytics basket tests. The basket must accept the variant, and the exact 2 and at least 3 tests try at most 5 candidates                                                                                                                                           |
| An active promotion for the ribbon and flyout tests, or an active campaign with a start and an end date for the ribbon test alone                                                                                                                                                                                     | The promotion tests (C2185235, C2185240, C2185241) and the SCAYLE Analytics ribbon test                                                                                                                                                                                        |
| An active automatic promotion without tiers or a code, whose conditions list a category (`categories.exists(c, c in [...])`) that holds a buyable product that gets the discount in the basket. A promotion that lists a category while no product gets its discount makes the test fail and not skip                 | The promotion price test (C2167321)                                                                                                                                                                                                                                            |
| Trending recommendations in the add-to-basket slide-in                                                                                                                                                                                                                                                                | The SCAYLE Analytics recommendations test                                                                                                                                                                                                                                      |
| At least 2 color chips in a filter                                                                                                                                                                                                                                                                                    | The SCAYLE Analytics filter test                                                                                                                                                                                                                                               |
| A color chip among the first five in the filter dialog that has a product at or under 10000                                                                                                                                                                                                                           | The PLP filters deep-link test (C2139744)                                                                                                                                                                                                                                      |
| A category whose `sale` filter matches at least one product, among the root categories and three levels below                                                                                                                                                                                                         | The PLP sale deep-link test, which has no TestRail case ID                                                                                                                                                                                                                     |

The SCAYLE Analytics tests assert `POST /api/analytics/events` from the browser, so run them against `pnpm dev` or a production build.

### Tests that fail when the structure is missing

No check guards the shop structure these tests assume. Make your shop match it, or adapt the test.

- **Page titles that name the category.** The navigation test expects the title of a main category page to contain the category name, and the title of a sub-category page to contain the category and its parent label.
- **An empty guest wishlist for the shop switch test.** The shop switch test from the wishlist (C2162471) waits for the wishlist empty state, and expects the URL to no longer contain `/wishlist` after the switch.
- **A first product with a selectable, buyable variant.** The happy path opens the first product of a listing, adds it to the wishlist and the basket, and expects the checkout to ask a guest to sign in. It needs a guest wishlist that is empty.
- **Filters that behave like the default Storefront Application.** The filter tests set a price range of 80 to 100, expect a color chip and a size checkbox, expect the filter counter to read 3, and expect a counter of 2 and a non-empty listing for a link with a color and `maxPrice=10000`. That test takes the first of the first five color chips that has a product at or under that price. The sale deep-link test needs a category whose `sale` filter matches at least one product, as the Storefront API's filters endpoint reports it. Both tests skip when the data is missing, see the table above. The search filter test expects price inputs where the maximum is above the minimum.
- **A default listing layout.** The items per row test expects 2 products per row at 390 px and 4 products per row at 1280 px.
- **Search and typeahead enabled.** The brand, product ID, and category name searches must resolve to results. Every country the search tests use needs searchable attributes in the SCAYLE Panel (Storefront > Search Configuration > Search Result Logic). Without them the Storefront API answers a term search with a 400 and the search results page returns a 500. The category name search compares the URL with the lowercase name, so names with spaces or umlauts fail.
- **Links that work.** The homepage test requests every link on the page that points to the shop itself. A link fails the test when its request answers with a status of 400 or higher, and when it has no `href`. Links to other sites are not checked. An unknown route must show the 404 page with a continue shopping button, and `c/does-not-exist-999999` must answer with 404. The route announcer test needs a wishlist page.
- **Account pages.** The account tests expect the sign-in and registration forms, the password reset flow, a subscriptions tab at the second position of the account menu, and a customer account `Aqa.testxx@test.com` that does not exist. The subscriptions tab only appears when `STOREFRONT_COUNTRIES_<COUNTRY>_SUBSCRIPTION_ENABLED` is `true` for the country under test.
- **Working checkout settings.** The signed-in checkout test adds a product, opens `/checkout`, and expects the Checkout Web Component to recognize the customer. Set `STOREFRONT_COUNTRIES_<COUNTRY>_CHECKOUT_SECRET` for the country under test. A working checkout also needs the `_CHECKOUT_USER` and `_CHECKOUT_TOKEN` values of that country. The test itself skips when no buyable product exists.
- **An order success error page.** The test for the error state (C2182954) hard-fails when the page does not render. It needs no catalog data.
- **Customers that can place an order.** The order success buy flow (C2173505) places a real order with each browser's test customer. Each customer needs a saved delivery address and must be old enough for the invoice payment method, which the checkout disables below a minimum age. The test selects invoice itself and fails with a clear message when it is disabled, because the checkout then preselects a payment provider that redirects away from the shop. The account test writes a random birth date between 1970 and 1999 onto the customers, so give them an adult birth date if you register them by hand. The checkout's success URL must point to the shop under test, since the test reads the order success page the checkout sends the customer to. Against a local storefront with the success URL of a deployed shop, the test fails after the order is placed.
- **Express checkout, when enabled.** With `E2E_EXPRESS_CHECKOUT_ENABLED=true`, the checkout web component script and a payment provider must be configured, or the component does not attach within 20 seconds. The first buyable product the suite finds must show a variant picker.
- **SCAYLE Analytics.** The tests wait up to 15 seconds for each SCAYLE Analytics event, and the browser back and forward test expects four Google Analytics 4 `page_view` entries in the data layer. The login and logout test skips on mobile and without customer credentials. The search resubmit test needs an active product with a name.

### Tests that are skipped on purpose

- The checkout overview test (C2132536, C2144177) is skipped in the code. It stays off until its setup is automated.
- Tests marked desktop-only or mobile-only skip in the other viewport. That is a skip by design, not a data gap.
- The gallery zoom tests and the filter flyout focus test run only in the `firefox` and `webkit` projects.
- The shop switch test from the wishlist (C2162471) skips in `mobile-safari`.
- The express checkout tests skip unless `E2E_EXPRESS_CHECKOUT_ENABLED=true`.
- The external search link tests (C2661287, C2661288, C2661289) skip unless the Storefront API resolves `EXTERNAL_SEARCH_TERM` to an external URL. See [External search link](#external-search-link).
- The status code tests in `redirects.e2e.spec.ts`, the search URL tests for a non-default country (C2663543, C2663544, C2663545), and the external search link status code tests (C2661287, C2661288) run only in the `chromium` project, because the status codes do not depend on the browser.
- The tenant data spec (`tenant-data.e2e.spec.ts`) fails when one of the first 10 active promotions lists a category the Storefront API no longer knows, for example after the catalog was replaced. It names the promotions and category IDs, so the fix is in the Panel and not in the shop. It also fails when a condition mentions categories in a format it cannot read, and it skips when no active promotion lists a category. The tenant data spec also compares the basket with the Storefront API for up to 5 products listed without reductions, and fails with the product IDs, the API price, the basket subtotal and the basket final price when they disagree. It does not say whether the difference sits in the shop data or in the Storefront API. A 429 or timeout in its log means a shop rate limit, so run it again first. It runs only in the `chromium` project and does not check promotion links.
- The root URL test (C2661279) skips on a shop that serves its default country at the root, and when the shop config flags no country as the default one.
- The `a11y-crawl` spec has its own projects, which exist only with `A11Y=1`. A normal run never crawls. See [Accessibility checks](#accessibility-checks).

### Promotions

Promotions are optional. Without an active promotion or campaign, the promotion tests skip with a reason and the run still completes. To run them, schedule a promotion in the SCAYLE Panel that covers your test run. The ribbon test accepts an active promotion or an active campaign. A campaign counts only when it has a start date and an end date, and now lies between them. The flyout test needs an active promotion, because a campaign alone renders a different card. When neither exists, the tests skip with a reason such as "No active promotion or campaign on this shop." A failing Storefront API call fails the test instead of skipping it.

The ribbon test asserts the countdown timer of the deal your storefront displays: the campaign if one is active, otherwise the active promotion with the highest priority. The timer must show unless that deal sets `hideCountdown` or, for a promotion, has no end date. The storefront shows no timer in either case, and the test expects none.

Your storefront caches promotions and the campaign for 5 minutes by default. A deal that started in the last 5 minutes can make the ribbon test fail, because the API reports it while the page does not show it yet. A retry inside the same window fails the same way, so wait for the cache to expire before you run it again. A deal that ended in the last 5 minutes usually makes the test skip.

### External search link

The external search link tests (C2661287, C2661288, C2661289) check that a search term that points to an external URL redirects to it with a full page load. They need a navigation item in the SCAYLE Panel and skip without it.

1. Create a navigation item in a menu the storefront does not render, so it never shows in the navigation. Set the target to Individual link, enter an external `https` URL, and tick Include to Search. Use a URL on a domain you control, or `https://example.com`, because search sends every visitor of that shop who enters the synonym to that URL.
2. Add a navigation synonym for the item on the country under test (Storefront > Search Configuration > Synonyms, section NAVIGATION ITEMS).
3. Set `EXTERNAL_SEARCH_TERM` in `support/constants.ts` to that synonym. It defaults to `scayle-external-test`, the synonym of the SCAYLE QA shop.

Panel search changes can take up to two hours to reach the shop, so set the item up before a run, not during one. Each test first asks the Storefront API where the term leads. It skips when the Storefront API does not resolve it to a navigation item with an external `https` link. When the API does resolve it, the shop has to redirect to that URL, and a shop that does not fails the test.

## Accessibility checks

The suite can scan your pages with axe, an accessibility checker. The checks are off by default and only report: they never fail a test. There are three ways to use them.

The flag scans the pages your own tests visit. With `A11Y=1`, every test records the pages it visits. After the test body ends, the suite opens a fresh page in the same browser context, so the session stays, visits each recorded kind of page and scans it. Nothing is scanned while the test is running, so a test can't notice it. A path segment that is a number or ends in a dash and a number stands for an id, so `/p/jacket-342691` and `/p/shoe-100200` are one kind of page, and so are category pages of any depth under `/c/`. If your shop serves categories under another first path segment, add it to `NESTED_SLUG_SECTIONS` at the top of `support/a11y.ts`. Each kind is scanned once per project and worker. Your specs don't change, as long as they import `test` from `fixtures/fixtures`. Run them with:

```bash
A11Y=1 pnpm test:e2e --project=chromium
```

Without `--project`, `A11Y=1` also runs the crawl in its own projects.

The replay runs after the test and its `afterEach` hooks, so it shows a page as the session leaves it. A hook that empties the basket or signs out changes what it sees, and a spec can opt out with `test.use({ a11yEnabled: false })`. A dialog, a half-filled form and a request your test stubs with `page.route` are not there, so use `checkA11y` below for those. The replay and the crawl mark the country switch suggestion as dismissed, because its dialog makes the rest of the page invisible to axe. A page that redirects, for example to the sign-in page after a sign-out, is skipped, and so is an order confirmation link with a `cbd` token. The replay stops after 15 seconds per test, and a page it did not reach is scanned in a later test that visits it. Each test lists what it scanned and skipped in its `a11y-replay` annotation.

The crawl scans a shop without knowing its pages. `tests/e2e/a11y-crawl.e2e.spec.ts` needs only `BASE_URL`. It opens the home page, follows the links inside your country, and scans each kind of page once, as described above. The crawl only opens pages: it never clicks a button, fills a form, signs in or changes the basket. It needs no test customers, no catalog data and no page objects, and it has its own projects without the sign-in setup, so no `--no-deps`. Run it with:

```bash
pnpm test:e2e:a11y
```

The script sets `A11Y=1` for Chrome and mobile Chrome. It uses POSIX shell syntax. In another shell, set `A11Y=1` yourself and run `playwright test --project=a11y-crawl --project=a11y-crawl-mobile`. Then print the results with `pnpm a11y:summary`.

`BASE_URL` picks the country. Keep the country prefix in it, for example `https://shop.example/de/`. Without a prefix, the crawl cannot tell your default country from the others and also follows links such as `/en/...`. The limits are constants at the top of the crawl spec: 20 pages, 2 hops from the home page, 3 pages under one first path segment. Edit them there. `EXCLUDE_PATHS` holds the paths the crawl skips: sign-out links, API paths and file downloads. It finds sign-out links by the words in the path, so a shop whose sign-out path uses other words adds them to the pattern, and a shop without a country prefix adds the other countries, for example `|^/(en|at)(/|$)`.

For a state the crawl and the replay can't reach, such as an open dialog or a half-filled form, call `a11y.checkA11y('label')` in your own spec at that point. It scans the page as it is and does nothing unless `A11Y=1` is set. Give each scan its own label, because two scans with the same label overwrite each other. The scan runs in axe's legacy mode, so it opens no helper page that a test watching for new pages could see, and it skips content inside cross-origin frames.

The crawl runs in Chrome and mobile Chrome. A slow API can make the suite's own requests time out. Raise `E2E_RPC_TIMEOUT_MS` then. Axe finds mechanical problems, such as missing alt text or low contrast. It cannot tell whether a page makes sense with a screen reader, so it does not replace a manual check. The [README](./README.md#accessibility-checks) explains the pieces.

### Read the accessibility results

The suite has no browsable accessibility report. With `A11Y=1` the crawl, the replay of your tests and every `checkA11y` call write their results as JSON files into the folder of the test under `test-results/`, named `axe-<label>.json`. Run `pnpm a11y:summary` to print one Markdown summary of the run.

- Violations are problems axe confirmed. Needs review lists items axe can't decide, such as contrast over a photo, which a person has to check.
- Impact runs from critical (some users can't complete a task) through serious (a task is hard or confusing) to moderate and minor (friction or structure problems).
- Skips are not in the summary. They appear in the run output and in `results.xml` with their reason, so keep the run log next to the results. A skip means the shop lacks that page or feature, not that the page passed. A kind of page the crawl never reached is not in the summary either.
- A selector that starts with `scayle-checkout` or `scayle-auth` points into a SCAYLE web component. You can't change it in your code, so report it to SCAYLE. Every other finding is in your own code.
- `test-results/` is gitignored, so keep it as a build artifact in CI. The files contain page text and HTML snippets, and `test-results/` can hold typed passwords in `error-context.md`. Share the summary, not the raw files. The retry traces also hold session cookies, so restrict who can download the artifact. See [Troubleshooting](#troubleshooting).

## Run the suite

Run the happy path first, from `testing/playwright/`. It runs as a guest, so it needs `STOREFRONT_API_KEY` and `STOREFRONT_TENANT_SPACE`, but no test customers:

```bash
pnpm test:e2e:happy-path --project=chromium
```

It opens the homepage, goes to a category through the main navigation, adds the first product to the wishlist and the basket, and expects the checkout to ask for a sign-in. If it passes, your storefront and `BASE_URL` are set up correctly. If it fails, check that `BASE_URL` opens in a browser, that your storefront is running, and that `STOREFRONT_API_KEY` and `STOREFRONT_TENANT_SPACE` are set. It skips when no main navigation entry links to a category with products.

Then run the rest, also from `testing/playwright/`:

```bash
# All end-to-end tests in every browser project
pnpm test:e2e

# One browser project
pnpm test:e2e --project=chromium

# One spec file (also runs the chromium setup project first)
pnpm exec playwright test tests/e2e/account.e2e.spec.ts --project=chromium

# Watch the tests in a visible browser
pnpm test:e2e --headed

# Playwright UI mode
pnpm test:e2e:ui

# Fewer parallel workers, to stay under the sign-in rate limit
pnpm test:e2e --workers=2
```

Each browser project first runs its own `<browser>-setup` project, which signs in the customers once and saves their sessions. A run limited to one browser signs in only that browser's customers. The happy path runs with `--no-deps`, so it skips the setup and stays a guest.

UI mode and the VS Code extension do not run setup projects unless you select them. Select `<browser>-setup` before you run a test that restores a signed-in session.

Locally, Playwright runs one worker per two CPU cores. Several browser projects signing in at once can reach the sign-in rate limit described under [Constraints and limits](#constraints-and-limits), so lower `--workers` or run one `--project` at a time if sign-ins fail.

In a pipeline, set `CI` and pass the variables from the table above through the environment. The suite then retries failed tests twice and runs with one worker. Keep the Playwright Docker image and the `@playwright/test`, `playwright`, and `playwright-core` packages on the same version.

## Read the results

Every run writes a JUnit report to `test-results/results.xml` and prints a skip-rate line:

```text
[playwright-skip-reporter] E2E: 12 skipped / 80 executed (13.0% skip rate)
```

After that line the reporter lists every skip for a catalog gap with its project and reason, then the other skips grouped by reason with a count, so a data problem that turned a test into a skip is visible in the log:

```text
[playwright-skip-reporter] 1 skipped for a catalog gap (data the shop does not have):
  - [chromium] C2167319 Verify Basket Price summary - regular product: Catalog gap: no sellable product without reductions and with a buyable variant.
[playwright-skip-reporter] other skips by reason:
  - 2x No sale product with a currently addable variant found - skipping test
```

The skip rate never fails a run. If you want a hard gate, add your own CI check on this line or on `results.xml`. A high rate usually means your catalog lacks data. The skip reason of each skipped test in the report names the data to add, and tests that skip for a catalog gap also carry a `catalog-gap` annotation.

A healthy first run on a shop with partial data still has some skips. The tests listed under "Tests that fail when the structure is missing" must pass, and every skip names the data it needs.

## Constraints and limits

### Permanent

- The suite does not start your application. Start it before the run, or point `BASE_URL` at a deployed environment.
- The suite does not create customers, orders, or catalog data. You prepare them in your shop.

### Known limitations

- The suite covers the `path` and `path_except_default` country selector modes. The domain and base-path modes are not covered.
- Some assertions in `support/constants.ts` hold text in the default shop's language. Adapt them to your shop's locale.
- The tests find elements through `data-testid` values and the markup of Storefront Application V3. If you change a component or remove a test ID in your storefront, update the matching page object in `page-objects/`, or the tests that use it fail.
- The Authentication API accepts about 10 sign-ins per customer per minute and answers `429 Too Many Requests` beyond that. Pipelines that run several browser projects in parallel reach the limit on shared customers such as `TEST_CUSTOMER_EMAIL6`. The setup waits for the next window and signs in once more. The suite saves one session per role, which keeps `TEST_CUSTOMER_EMAIL6` to one sign-in per job.
- Playwright writes `error-context.md` into `test-results/` for every failed test, whatever `trace` is set to. It holds a snapshot of the page, which can include the value typed into a password field. Browser projects also record a trace on the first retry (`trace: 'on-first-retry'`), and CI retries twice. A failed spec that types `TEST_CUSTOMER_PASSWORD` can therefore leave the password under `test-results/`. Restrict who can download that folder from your pipeline artifacts. Setting `trace: 'off'` does not remove `error-context.md`.

## Troubleshooting

### Tests fail with "No saved session"

**Possible causes:** The `<browser>-setup` project could not sign in the customer, so it skipped. A `TEST_CUSTOMER_*` variable is missing, the password is wrong, or the sign-in is still rate-limited after the retry.

**Solution:**

1. Read the skip message of the setup project and the console output. They name the cause, with the password masked. Other files under `test-results/` are not masked, see [Known limitations](#known-limitations).
2. Fix the variable or the password, or wait a minute if the sign-in was rate-limited.
3. Run the browser project again. Each setup run deletes the old session file first.

**Prevention:** Check the customers once with a manual sign-in before the first run. Session files older than 24 hours are rejected with their own message, so a leftover file never passes as a live session. The sessions are stored in `.auth/`, which Git ignores.

### The promotion ribbon test fails right after you scheduled a promotion

**Possible causes:** The storefront caches promotions for 5 minutes. The API already reports the deal, but the page does not show it yet.

**Solution:**

1. Wait for the cache to expire.
2. Run the test again. A retry inside the same window fails the same way.

**Prevention:** Schedule promotions at least 5 minutes before a run.

## Reference

- [Playwright test configuration](https://playwright.dev/docs/test-configuration)
- [Playwright installation](https://playwright.dev/docs/intro)
