# @scayle/storefront-application-playwright

A comprehensive end-to-end testing suite for the SCAYLE Storefront Application using Playwright. This package provides browser automation and user journey validation capabilities to ensure the Storefront delivers an excellent user experience across all devices and browsers.

## Overview

The Playwright E2E testing suite provides comprehensive browser automation and user journey validation for SCAYLE Storefront Applications, including:

- **Cross-browser Testing**: Full compatibility testing across Chromium, Firefox, and WebKit
- **Mobile Web Testing**: Native mobile emulation via Playwright's `Galaxy S9+` (mobile-chrome) and `iPhone 15` (mobile-safari) device profiles
- **Page Object Model**: Maintainable and reusable test components
- **Comprehensive Coverage**: Complete user journey testing from homepage to checkout

To run the suite against your own shop, follow [SETUP.md](./SETUP.md). It covers the install, the `.env` file, the test customers, and the catalog data the tests look for.

## Key Features

- **Cross-browser Support**: Test on all modern rendering engines with a single API
- **Cross-platform Testing**: Run tests on Windows, Linux, or macOS, locally or on CI
- **Mobile Web Emulation**: Native mobile device testing capabilities
- **Page Object Model**: Reusable components for maintainable test code
- **CI/CD Integration**: Designed for seamless integration with continuous integration pipelines

## Test Categories

### E2E Tests

Complete user journeys covering all critical storefront functionality:

- **Account Management**: User registration, login, profile management
- **Product Browsing**: Category navigation, product listing, search functionality
- **Shopping Experience**: Product details, add to basket, wishlist operations
- **Checkout Process**: Complete order flow from basket to confirmation
- **Order Management**: Order history, order details, returns
- **Navigation**: Header, footer, breadcrumbs, mobile navigation
- **Promotions**: Banner displays, promotional content, special offers

### Happy Path Tests

Critical user flows validation:

- **Complete Purchase Journey**: From product discovery to order confirmation
- **User Registration and Login**: Account creation and authentication flows
- **Search and Discovery**: Product search and category navigation

## Test Scenarios

The Playwright suite includes comprehensive test scenarios covering:

- **User Authentication**: Login, registration, password reset, account management
- **Product Discovery**: Search, filtering, category browsing, product recommendations
- **Shopping Basket**: Add/remove items, quantity updates, basket persistence
- **Checkout Process**: Address management, payment processing, order confirmation
- **Order Management**: Order history, order details, tracking information
- **Navigation**: Main navigation, mobile menu, breadcrumbs, footer links
- **Country Detection**: Automatic country selection and shop switching
- **Promotions**: Banner displays, promotional offers, special pricing
- **Wishlist**: Add/remove items, wishlist management, sharing functionality

## Linting

Run from `testing/playwright/`:

- **`pnpm lint`** — audit the test code, no fixes (this is what the pre-push hook and CI run).
- **`pnpm lint:fix`** — auto-fix what can be fixed.

The config (`eslint.config.mjs`) extends `eslint-plugin-playwright`'s recommended
rules. A new `page.waitForTimeout()` **fails** lint (state-based waits only).
`waitForLoadState('networkidle')` and the `force` option on interactions are
currently flagged as **warnings** and will be promoted to errors once the
networkidle/force cleanup follow-up removes the existing call sites.

## Test Structure

The Playwright E2E testing suite follows a modular architecture:

**Page Objects:**

- `page-objects/` - Reusable UI components following the Page Object Model pattern
- `page-objects/base/` - Base page classes and common functionality
- `page-objects/components/` - Individual UI component page objects

**Test Files:**

- `tests/e2e/` - End-to-end test specifications
- `tests/happy-path.e2e.spec.ts` - Critical user flow validation

**Support Files:**

- `fixtures/` - Test data and shared utilities
- `support/` - Helper functions, constants, and utilities

**Configuration:**

- `playwright.config.ts` - Playwright configuration and test settings
- `tsconfig.json` - TypeScript configuration for tests

## Running Tests

### Prerequisites

Install the suite, create the `.env` file, and start your storefront as described in [SETUP.md](./SETUP.md). It also lists every environment variable and what each one does.

### URLs in specs

`BASE_URL` is the homepage of the shop under test: the origin plus the country prefix, if the shop has one, with a trailing slash. The same specs then run against another country or a shop without a prefix by changing that one value. Specs pass paths relative to it, so `page.goto(ROUTES.basket)` opens `/de/basket` for `https://localhost:3000/de/` and `/basket` for `https://localhost:3000/`. Three rules keep this working:

- Write paths without a leading slash. A path that starts with `/` resolves against the origin and skips the country prefix. The storefront redirects an unprefixed path to the default country, which hides the mistake for the default shop, so an ESLint rule rejects a literal path that starts with `/`. A path held in a variable or constant is not checked.
- Take the homepage URL for assertions from `getHomepageUrl(baseURL)`. The storefront serves a country homepage without the trailing slash (`/de`).
- Leave the query string and hash out of `BASE_URL`. A relative path would drop them, so the config rejects them.

The suite runs against the path and path-except-default routing modes. Domain and base-path modes are not covered yet. `page-objects/components/rpc.ts` and `page-objects/components/search.ts` call the API at the origin root, which a base path would change. The country detector tests use the fixed `/en` and `/de` paths of path routing, so they fail in the other modes.

### Test data requirements

The tests look up products, categories, and promotions in your shop through the Storefront API, and they need test customers with a specific state. [SETUP.md](./SETUP.md) lists every data precondition, grouped by whether a test skips or fails when the data is missing. See "Prepare your shop data" there for the catalog and promotion requirements.

### Test Execution

```bash
# From the application root, go to the suite
cd testing/playwright

# Run all E2E tests
pnpm test:e2e

# Run specific test categories
pnpm test:e2e:happy-path

# Run tests with UI mode
pnpm test:e2e:ui
```

### Signed-in sessions

Tests that only need a signed-in customer start from a saved session instead of signing in through
the UI. Each browser project depends on its own `<browser>-setup` project (`tests/auth.setup.ts`),
which signs in each customer role from `support/auth.ts` once per run and saves the session to
`.auth/<browser>-<role>.json`. A run limited to one browser, for example
`pnpm test:e2e --project=webkit`, runs only `webkit-setup` before the `webkit` tests.

Browser projects start as a guest. A `describe` block opts into a saved session with
`test.use(authState('default'))`. Keep the sign-in UI for tests that verify signing in, merge a
guest basket into a customer basket, or sign out. Signing out from a restored session ends it on
the server for every later test that restores it. A test that signs in through the UI in its own
context and signs out again, as the flyout test in `account.e2e.spec.ts` does, gets its own session
and leaves the saved one alive.

The orders test in `orders.e2e.spec.ts` also still signs in through the UI. It only needs a signed-in
customer, but it uses `TEST_CUSTOMER_EMAIL1` for every browser project and runs once per customer
and browser, so a saved session would cost the same sign-in. Add a role to `AUTH_ROLES` only when
several tests share a customer.

The SCAYLE Authentication API rate-limits sign-ins per customer. One saved session per role keeps shared customers under that limit, see [Constraints and limits](./SETUP.md#constraints-and-limits) in SETUP.md.

A role's setup test skips instead of failing when its `TEST_CUSTOMER_*` variables are missing or
the sign-in fails. A failure other than a rate limit skips only after the last retry, since
Playwright does not retry a skipped test. The guest tests still run, and only the tests that
restore that role fail, with an error that names the missing session. Each setup run deletes the
role's old `.auth` file first. [Troubleshooting](./SETUP.md#tests-fail-with-no-saved-session) in
SETUP.md covers the causes, the session age limit, and what is masked in the output.

UI mode and the VS Code extension need the `<browser>-setup` project selected, see [Run the suite](./SETUP.md#run-the-suite) in SETUP.md.

### Skip-rate summary

Every run prints a non-blocking skip-rate line at the end of the console output. See
[Read the results](./SETUP.md#read-the-results) in SETUP.md for the format and how to gate on it.

### Test Categories

**E2E Tests:**

- Complete user journey validation
- Cross-browser compatibility testing
- Mobile web testing
- Component interaction testing

**Happy Path Tests:**

- Critical user flow validation
- End-to-end purchase journey testing
- Authentication flow testing

### Accessibility checks

The suite can scan pages with [axe](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright). The scans are opt-in and only report, so no test fails on a violation and a normal run keeps its behavior and runtime.

```bash
# Crawl the shop in Chrome and mobile Chrome with scans on
pnpm test:e2e:a11y

# Group the results of the last run by rule, impact, page and viewport
pnpm a11y:summary
```

- With `A11Y=1`, every test records the pages it visits. After the test body, the suite revisits each kind of page once in a fresh page of the same context and scans it. Run your specs with `A11Y=1 pnpm test:e2e --project=chromium`. See [SETUP.md](./SETUP.md#accessibility-checks) for what the replay can't see.
- The crawl, `tests/e2e/a11y-crawl.e2e.spec.ts`, scans a shop without any knowledge of its pages. It follows links from the home page within limits you edit at the top of the spec, and it only opens pages. It runs in its own projects, which exist only with `A11Y=1`, so it needs no sign-in setup. `BASE_URL` picks the country, see [SETUP.md](./SETUP.md#accessibility-checks). Each scan is attached to the test as `axe-<label>.json` and holds the `violations` and `incomplete` lists. The label comes from the URL path, with a segment that is a number or ends in a dash and a number counted as an id.
- The `a11y` fixture adds `a11y.checkA11y(label)` for states the crawl and the replay can't reach, such as an open modal or a half-filled form.
- The tags that every scan uses live in `AXE_TAGS` in `support/a11y.ts`. WCAG 2.2 rules such as `target-size` are not included.

Axe covers the mechanical WCAG checks. It can't judge alt text quality, focus order, visible focus, screen reader announcements or contrast over images, and it skips cross-origin iframes such as payment frames. Keyboard-only and screen reader passes stay manual. [SETUP.md](./SETUP.md#accessibility-checks) explains how to set the checks up and read the results.

### Debug and Development

```bash
# Run tests in headed mode (visible browser)
pnpm test:e2e --headed

# Run specific test file
pnpm test:e2e tests/e2e/account.e2e.spec.ts

# Run tests in debug mode
pnpm test:e2e --debug

# Generate test report
pnpm test:e2e --reporter=html
```

Express checkout tests in `tests/e2e/express-checkout.e2e.spec.ts` are skipped by default. SETUP.md
describes `E2E_EXPRESS_CHECKOUT_ENABLED` and what the shop needs for them.

The external search link tests in `tests/e2e/search.e2e.spec.ts` (C2661287, C2661288, C2661289) skip
unless the Storefront API resolves `EXTERNAL_SEARCH_TERM` (in `support/constants.ts`) to an external URL.
SETUP.md describes the navigation item and synonym the shop needs for them.

The SCAYLE Analytics smoke test in `tests/e2e/scayle-analytics.e2e.spec.ts` asserts
`POST /api/analytics/events` from the browser. It runs against `pnpm dev` or a production build;
the server skips forwarding to the Storefront API in dev mode only.

## Page Object Model

The Playwright suite uses the Page Object Model pattern for maintainable and reusable test code:

**Base Class:**

- `Base` (`page-objects/base/base.ts`) - Common functionality shared by every page object and component, including `isMobileViewport` and the `navigate` helper.

**Page Objects:**

- `HomePage` - Homepage interactions and elements
- `ProductDetailPage` - Product page functionality
- `BasketPage` - Basket operations
- `CheckoutPage` - Checkout process management
- `AccountPage` - User account functionality

**Component Objects:**

- `Header` - Navigation and header elements
- `Search` - Search functionality and suggestions
- `Filters` - Product filtering and sorting
- `Pagination` - Page navigation controls

### Adding a new page object or component

1. Create the class under `page-objects/` (full pages) or `page-objects/components/` (reusable UI fragments), extending `Base`.
2. Register it as a fixture:
   - **Simple page object** (constructor takes only `page`): add one entry to `pageObjectMap` in `fixtures/pageObjects.ts` (`yourName: YourClass`). The fixture function is generated and the fixture type is derived from the map, so there is no `async ({ page }, use) => …` boilerplate and no `Fixtures` interface line to add.
   - **Fixture with dependencies or custom setup** (e.g. needs `rpc`, or runs its own logic): add a line to the `Fixtures` interface in `fixtures/fixtures.ts` and write the fixture explicitly in the `test.extend` object, like `basketPage` / `rpc`.
3. Use it in tests via the fixture (`async ({ yourName }) => { ... }`), not by constructing it directly in the test file.

## Important Notes

⚠️ **Test Environment**: Always ensure you're running tests against appropriate environments:

- Use dedicated test environments (not production)
- Ensure test data is properly configured
- Verify all required services are running
- Monitor test execution for any failures

**Best Practices:**

- Use descriptive test names and organize by feature
- Follow the Page Object Model pattern for maintainable code
- Include both positive and negative test cases
- Keep tests independent and avoid dependencies between tests
- Use appropriate wait strategies and assertions
- Clean up test data after test execution

**Browser Support:**

- Chromium: Full feature support
- Firefox: Complete compatibility testing
- WebKit: Safari compatibility validation
- Mobile: `Galaxy S9+` (mobile-chrome) and `iPhone 15` (mobile-safari) device emulation

## Documentation

- [Official Playwright Documentation](https://playwright.dev/docs/intro)
- [SCAYLE Storefront Application end-to-end testing documentation](https://scayle.dev/documentation/storefront/storefront-application-v3/testing/end-to-end-testing)
