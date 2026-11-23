# CLAUDE.md — Playwright E2E suite

End-to-end tests for the Storefront Application V3. They drive a running storefront and do not start the app. Setup, test data, environment variables and run options are in [SETUP.md](SETUP.md) and [README.md](README.md).

## Commands

Run from this directory (own ESLint config).

- `pnpm test:e2e`: all of `tests/e2e/` in every browser project. Narrow with `--project=chromium` or a file path.
- `pnpm test:e2e:happy-path`: `tests/happy-path.e2e.spec.ts` with `--no-deps`, so no sign-in setup runs and the test stays a guest.
- `pnpm lint` / `pnpm lint:fix`, `pnpm typecheck` (`tsc --noEmit` over tests, fixtures, page objects, support files).
- `pnpm test:e2e:a11y` / `pnpm a11y:summary`: axe crawl (`a11y-crawl` projects, `A11Y=1`, needs only `BASE_URL`), then the results. See SETUP.md.

Tests need `STOREFRONT_API_KEY`, `STOREFRONT_TENANT_SPACE` and the `TEST_CUSTOMER_*` accounts, plus `BASE_URL` unless the local default fits. Keep the `TEST_CUSTOMER_*` names, since the specs and `.env.example` read them. `test:e2e:happy-path` needs the API key and tenant space (it asks the Storefront API which categories hold products) but not the customers. Without a reachable storefront and accounts, only lint and typecheck run.

This suite is product-facing.

## Layout

- `tests/e2e/*.e2e.spec.ts`: one file per feature area. `tests/auth.setup.ts` signs in and saves sessions.
- `page-objects/` (one class per page, extending `Base`) and `page-objects/components/` (reusable fragments).
- `fixtures/fixtures.ts`: the single `test` export. Specs import `test` from here, never `@playwright/test`. `expect` still comes from `@playwright/test`. `fixtures/pageObjects.ts` holds the `page`-only page object map.
- `support/`: `constants.ts` (routes, test data, `TEST_CUSTOMERS`), `utils.ts`, `auth.ts`, `storefrontAPIClient.ts`, `shopId.ts` (`E2E_SHOP_ID` override), `productTestHelpers.ts`, `a11y.ts`, `deferredReloads.ts`.
- `reporters/skip-rate-reporter.ts`: prints the skip rate, never fails a run.

## Test data from the Storefront API

The suite does not know the shop's catalog. A test never hardcodes a product ID, category or name. It asks the Storefront API for data that fits the scenario, then drives the UI with it. That is why the specs run against any shop.

- The `storefrontAPIClient` fixture reads the catalog (from `STOREFRONT_API_KEY`, `STOREFRONT_TENANT_SPACE` and the `shopId` fixture, taken from the Inertia `[data-page]` payload or `E2E_SHOP_ID`). It only reads. Mutations go through the UI.
- `findProduct(predicate)` pages through the catalog (up to 25 pages of 25) and returns the first match. The predicate states the property the scenario needs. Reuse `isProductSellableNow`, `isVariantBuyableNow`, `isVariantOutOfStock`. The client also has finders for categories, subcategories, search terms and reference keys.
- When a match can still fail in the UI, loop over candidates with a `skippedProductIds` set.
- A new scenario gets an inline predicate. Add a client method (with JSDoc) once a second spec needs it.
- No match is a catalog gap, not a failure. Skip through `skipForCatalogGap()` (or `test.skip` with a reason). Never fall back to hardcoded data and never pass without asserting.
- Every lookup is a paginated request. Keep predicates narrow and don't scan the catalog in `beforeEach` for tests that don't need it.

## Page objects and fixtures

- Locators are `readonly` properties assigned in the constructor. Prefer `getByTestId` and `getByRole`. If a locator isn't stable, add a `data-testid` to the Vue component, not a CSS selector.
- A page object whose constructor takes only `page` needs one entry in `pageObjectMap` (`fixtures/pageObjects.ts`). One with dependencies (`rpc`) needs a line in the `Fixtures` interface and an explicit fixture in `fixtures/fixtures.ts` (`basketPage`). Specs get page objects through fixtures, never construct them.
- The `context` fixture aborts consent manager and Google Tag Manager requests. Keep third-party consent and tracking out of tests.
- Inertia loads deferred props after mount, and a late reply can undo a test's interaction (the `variantId` of a picked size). Call `waitForDeferredReloads()` (on `Base`) before such an interaction. The `page` fixture installs the tracker, so a page from `context.newPage()` is not covered.
- Mobile and desktop render different DOM. Branch on `isMobile(page)` or `isMobileViewport`.

## Navigation and URLs

`BASE_URL` is the shop homepage with country prefix and trailing slash (`https://localhost:3000/de/`), and Playwright's `baseURL`.

- Navigate with paths relative to it and without a leading slash (`ROUTES.basket`). A leading `/` resolves against the origin, skips the country prefix and hides the mistake on the default country. ESLint rejects literal leading-slash paths in `goto`, `waitForURL`, `toHaveURL` and `navigate` (a path in a variable isn't checked).
- A URL assertion needing the slash wraps it in a `RegExp`: ``toHaveURL(new RegExp(`/${ROUTES.basket}`))``.
- Get the homepage URL for assertions from `getHomepageUrl(baseURL)`, the storefront serves `/de` without the slash.
- The suite covers `path` and `path_except_default` country modes, not domain or base-path modes.

## Authentication

- Browser projects start as a guest. A `describe` block opts into a saved session with `test.use(authState('default'))`. Roles are in `AUTH_ROLES` (`support/auth.ts`). Add a role only when several tests share that customer, each adds one sign-in per browser project to every run.
- Each browser project depends on its own `<browser>-setup` project. If setup can't sign in it skips, and tests restoring that session fail naming the role, project and setup project.
- Each browser has its own customer (`getCustomerForBrowser`), so parallel runs don't clash on basket and wishlist. Don't share a customer across browsers in state-changing tests.
- Don't restore a saved session in tests that sign out, it ends the session server-side for every later test.
- The Authentication API allows about 10 sign-ins per customer per minute and answers `429` beyond that.
- `.auth/` holds live tokens and is gitignored. Setup projects run with `trace: 'off'` so the typed password stays out of traces. Keep it, and never log credentials. Playwright still writes `error-context.md` for failed tests, so `test-results/` can hold the typed password and must stay restricted.

## Writing tests

- Existing titles start with a TestRail case ID (`C2139186: ...`) for the opt-in reporter. Keep it when editing. A fork without TestRail can use its own ID scheme consistently.
- Wrap logical phases in `test.step()`.
- Wait on state, never time. `page.waitForTimeout()` fails lint. Don't add new `waitForLoadState('networkidle')` or `force: true` (lint warnings that old code still has). Use web-first assertions, `locator.waitFor()`, `waitForResponse`, or `expect(async () => {...}).toPass()` for hydration-dependent flows.
- Keep tests independent and clean up what they create (empty the basket).
- Some assertions in `support/constants.ts` hold copy in the default shop's language. Prefer structure and test IDs over copy, and adapt those constants to your locale.
- Document prerequisites in a JSDoc block above the test (which customer, in what state).

## CI

The Playwright Docker image (if your pipeline uses one), `@playwright/test`, `playwright` and `playwright-core` MUST stay on one version. Bump them together. `TESTRAIL_RUN_ID` enables the TestRail reporter, without it the reporter is off.
