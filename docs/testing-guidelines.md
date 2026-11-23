# Testing Guidelines for Storefront Application V3

The SCAYLE Resource Center covers [Unit Testing](https://scayle.dev/documentation/storefront/storefront-application-v3/testing/unit-testing), [End-to-End Testing](https://scayle.dev/documentation/storefront/storefront-application-v3/testing/end-to-end-testing) and [Accessibility Testing](https://scayle.dev/documentation/storefront/storefront-application-v3/testing/accessibility-testing).

## TL;DR

Test the logic a mistake is likely to hide in: mappers, price and promotion handling, services, controllers, composables, and error paths. One test checks one behavior, and its name says which. Three or more tests that differ only by input and expected output become one `test.for` table. Build test data with the factories in `@test/*` and `@scayle/storefront/test`, and add a typed factory before you reach for `as unknown as`. When your tests raise coverage, raise the coverage thresholds in `vitest.config.ts` in the same merge request.

Section 9 lists which Vitest features to use in these tests and which to avoid.

## 1. Where Tests Live and How to Run Them

Tests sit next to the file they test: `basketMapper.ts` and `basketMapper.test.ts` share a folder. A test that mounts a component or needs `document` ends in `.vue.test.ts` and runs in happy-dom, even when it covers a composable or a utility. Everything else runs in Node without a `@vitest-environment` docblock. There `import.meta.env.SSR` is `true`, so a test that covers a client-only branch, such as a write to module-scope state, sets it with `vi.stubEnv('SSR', false)`. A component test that asserts server-rendered output, such as the `<head>` Inertia collects, opts into Node with `// @vitest-environment node`, because Inertia only takes its server branch when `window` is undefined. The components project unmounts every wrapper after each test through `src/test/autoUnmount.ts`, so a test file doesn't call `enableAutoUnmount` itself.

The Storefront Application V3 splits its suite into six Vitest projects by folder: `components`, `client`, `shared`, `i18n`, `server`, and `scripts`. Every test file imports `describe`, `it`, and `expect` from `vitest` explicitly.

Run these commands from the application's root directory, where `package.json` and `vitest.config.ts` live:

| What you want to run                            | Command                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| One test file                                   | `pnpm exec vitest run <path to test file>`                       |
| The Storefront Application V3 suite             | `pnpm test`                                                      |
| One project                                     | `pnpm test --project=v3:boilerplate:server`                      |
| The suite with coverage, as CI runs it          | `pnpm test:ci`                                                   |
| Coverage for only the files your branch changed | `pnpm exec vitest run --coverage --coverage.changed=origin/main` |

The changed-files run checks the coverage thresholds against those files alone, so a changed file with low coverage fails it even when the full suite passes.

Coverage uses the `v8` provider. The `text` reporter prints a summary to the terminal. The `cobertura` reporter writes an XML report to the `coverage/` directory, where `pnpm test:ci` also writes its JUnit file.

### Tests that import `@scayle/storefront`

Vitest runs without the Vite plugin that resolves `virtual:storefront-config` in a build. The `vitest.config.ts` of the application aliases that module to `storefront.config.ts` and inlines `@scayle/storefront`, so the alias also applies inside the package. The `STOREFRONT_*` values that `storefront.config.ts` reads come from the `test.env` block of `vitest.config.ts`. When you add a config field that reads a new variable, add a value for it there.

## 2. What to Test

Put tests where a mistake is likely and hard to spot by clicking through the shop:

- Mappers, especially money (integer minor units), promotions, and price ranges.
- Services and controllers: which Storefront API calls they make, what they do with an empty or failed response, and which page props they produce.
- Composables with branching state.
- Every error path a customer can reach.

Skip code a test adds no confidence to: pure type files, re-exports, getters that return a field, and templates without conditions.

## 3. What a Good Test Looks Like

- One behavior per test. The name states the behavior and its condition: `returns no price when the variant is sold out`, not `works correctly`.
- Build the input, call the code once, then assert. A test that needs a second call usually wants to be a second test.
- Assert on output. Check what the function returns or what the page receives. Assert that a mock was called only when the call itself is the behavior, for example "skips the campaign fetch on the basket page".
- Test each behavior on one layer. If a mapper test already pins how a price is formatted, the controller test checks that the controller passes the mapped value through and leaves the formatting alone.
- Keep the values that matter visible. A reader sees in the test itself which fields decide the outcome, and a factory with overrides fills in the rest.

## 4. Parameterize or Merge

Three or more tests that run the same code and differ only by input and expected output belong in one `test.for` table:

```ts
// File: src/shared/utils/subscription.test.ts
import { describe, expect, it } from 'vitest'
import { formatDeliveryDay } from './subscription'

describe('formatDeliveryDay', () => {
  const mockT = (key: string): string => {
    const suffixes: Record<string, string> = {
      'subscription.ordinal_suffix.one': 'st',
      'subscription.ordinal_suffix.two': 'nd',
      'subscription.ordinal_suffix.few': 'rd',
      'subscription.ordinal_suffix.other': 'th',
    }
    return suffixes[key] ?? key
  }

  it.for([
    [1, '1st'],
    [7, '7th'],
    [15, '15th'],
    [31, '31st'],
  ] as const)('formats day %i as %s', ([day, expected]) => {
    expect(formatDeliveryDay(day, 'en-GB', mockT)).toBe(expected)
  })
})
```

`test.for` hands each row to the test as one argument, so an array row is destructured in the parameter list, and object rows work the same way. Keep tests separate when their setup differs, or when a failing row wouldn't tell the reader what broke. A table with one row is a plain test.

Existing `it.each` and `describe.each` tables stay as they are until the test changes for another reason.

## 5. Fixtures, Factories, and Mocks

### Reuse before you write

Check these first:

- `@scayle/storefront/test` provides `createMockStorefrontContext`, `createMockStorefrontCountry`, `createMockStorefrontConfig`, `createMockSession`, `createMockCache`, `createMockRequestContext`, `createMockIncomingRequest`, `createMockMapperRegistry`, `createMockServiceRegistry`, `createMockSSRRenderContext`, `createContext`, and `resetStaticCache`. The Storefront Application V3 re-exports all but `createMockStorefrontConfig` and `resetStaticCache` from `@test/utils/context`, where its own `createMockMapperRegistry(storefront, overrides)` takes the storefront context first and adds a real `i18n` slot.
- `@scayle/storefront/test` also builds raw Storefront API responses for mapper and service tests: `createApiProduct`, `createApiVariant`, `createApiPrice`, `createApiBasket`, `createApiBasketItem`, `createApiCategory`, `createApiCampaign`, `createApiPromotion`, and `createApiBasketItemPromotion`. `createApiOrder`, `createApiOrderItem`, `createApiAddress`, and `createApiPackage` build the raw order of the Customer Account API. A basket item defaults to a quantity of 2, so its total differs from its unit price. The fishery factories in `@scayle/storefront-api/test/factories` stay with Storefront Application V2.
- `@test/mock-data` has factories for the mapped types the pages and components receive. Each one returns the shape the application's mapper produces, including the fields the application adds to the SDK types. `src/server/services/mappers/mock-data-factories.test.ts` pins the promotion, campaign and category factories to their mappers' output, so a mapper change fails there instead of drifting:
  - `basket`: `createMockBasket`, `createMockBasketItem`
  - `products`: `createMockDetailedProduct`, `createMockListingProduct`, `createMockProductVariant`, `createMockVariantPrice`
  - `promotions`: `createMockPromotion`, `createMockTieredPromotion`, `createMockCampaign`
  - `categories`: `createMockCategory`
  - `customers`: `createMockCustomer`
  - `wishlist`: `createMockWishlist`, `createMockWishlistItem`
  - `seo`: `createMockSEOMeta`
  - `orders` and `search`: orders and search suggestions
- `@test/mocks` replaces whole modules. `vue-i18n` echoes the key, followed by the values passed with it (`basket.items({"count":2})`), so one mock fits every component that only calls `t`: `vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))`, plus `mocks: { $t: t }` when the template calls `$t`. A component that also reads `locale` or `te` mocks `vue-i18n` with its own `vi.mock` factory. `richtext` returns CMS HTML unsanitized.
- `@test/stubs` has basket, CMS, and common component stubs, including `SFButtonStub` and `SFLinkStub`. Stories import `mock-data` and `stubs` by relative path, since only the tests resolve `@test/*`. `mocks` only replaces a module through `vi.mock`, and `utils/context` imports `@scayle/storefront/test`, so both stay in tests.
- `@test/utils` has the context, Inertia (`createReactivePage`, `createDeferredStub`), and oRPC (`createSafeSuccess`, `createSafeFailure`, `createRpcClientMock`) helpers.

### Factories

A factory takes a partial override and returns a complete, typed object, so a test spells out only the fields it cares about. `SFProductActions.vue.test.ts` builds its sold-out product this way:

```ts
import { createMockDetailedProduct } from '@test/mock-data/products'

const product = createMockDetailedProduct({ isSoldOut: true })
```

Most `as unknown as` casts in test files build a partial domain object by hand. A factory removes the cast and keeps the object valid when the type gains a required field. Registry slots, Storefront API resources, and context variables need no cast either: `createMockMapperRegistry`, `createMockServiceRegistry`, the `storefrontAPI` override of `createMockStorefrontContext`, and the `variables` option of `createMockSSRRenderContext` each take only the members the code under test reaches. `src/server/controllers/subscription-cancellation.test.ts` shows the registry and render context doubles.

### Fixtures

Calling a factory inline is the default. Reach for a `test.extend` fixture when a value needs cleanup after each test, or when most tests in a file need the same value. Vitest infers the fixture's type from what the factory returns, and each test receives a fresh value:

```ts
import { test as base, expect } from 'vitest'
import { createMockStorefrontContext } from '@test/utils/context'

const test = base.extend('storefront', () => createMockStorefrontContext())

test('reads the basket from the session', async ({ storefront }) => {
  // ...
})
```

### Mocks

- Type a mocked import with `vi.mocked(fn)`.
- Use `vi.spyOn` to replace one method of a real object, and `vi.mock` to replace a whole module.
- For a partial module mock, write `vi.mock(import('./module'), async (importOriginal) => ({ ...(await importOriginal()), fetchBasket: vi.fn() }))`. With the `import()` form, TypeScript checks the path, and `importOriginal` returns the module's real type.
- Use `vi.hoisted` only for a value that a `vi.mock` factory references. Vitest moves `vi.mock` above the imports, so a plain top-level variable doesn't exist yet when the factory runs.
- Use `mockThrow(error)` for a mock that throws, and `vi.when(fn).calledWith(...).thenReturn(...)` for a mock that answers differently per argument.
- Don't add a `beforeEach` or `afterEach` hook that only calls `vi.clearAllMocks()`. Vitest clears every mock's call history before each test. A `vi.clearAllMocks()` call still has a job after setup code that calls a mock, when the test then asserts on calls made after that point.
- Create spies and stubs in `beforeEach` or in the test, not at module level or in `beforeAll`. Every project restores `vi.spyOn` spies and undoes `vi.stubEnv` and `vi.stubGlobal` before each test, so a spy created once lasts for the first test only. Don't add a hook that only calls `vi.restoreAllMocks()`, `vi.unstubAllEnvs()` or `vi.unstubAllGlobals()`. Call them yourself only when an `afterAll` hook needs the original back, because the config does not run after the last test.

## 6. Assertions

- Use `toMatchObject` to check the fields that matter on a larger object, instead of a run of `expect(result.field).toBe(...)` lines.
- Use `toEqual` when the whole value is the contract, for example a mapper's full output.
- Use `expect.poll` for a value that settles asynchronously. It fails once its timeout passes, so a slow case shows up as a failure instead of passing late.
- Don't use snapshots. A mapper's expected output belongs in the test where a reviewer reads it, and an updated snapshot rarely gets read.
- Await every `resolves` and `rejects` assertion. Vitest fails a test that skips the `await`.

## 7. Type-Level Tests

Contracts that only the type system can check live in `*.test-d.ts` files next to the code. `pnpm typecheck` checks them, not Vitest. Write the assertions with `expectTypeOf` from `vitest` (for example `expectTypeOf<Actual>().toEqualTypeOf<Expected>()`) or with `@ts-expect-error` lines. A failed `expectTypeOf` assertion is a type error, and an `@ts-expect-error` line fails the typecheck as soon as the error it expects stops happening, so a loosened type breaks CI either way.

## 8. Coverage Thresholds

CI fails when coverage drops below a threshold. The Storefront Application V3 thresholds live in `vitest.config.ts` under `coverage.thresholds`.

When your tests raise coverage, raise the thresholds in the same merge request, to the new value rounded down to a whole number. Rounding down keeps a run that covers one branch fewer from failing the pipeline. Don't lower a threshold to get a pipeline green. Lower it only when the drop comes from deleting covered code or from code that can't be tested, and say which in the merge request.

## 9. Vitest Features: Use or Avoid

The rules above come from a review of the features in Vitest 5.0.2. This table gives the decision per feature and the reason, so you know which ones to reach for in these tests. Revisit it when the project moves to a new Vitest major.

| Feature                                      | Use it?                                                     | Why                                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clearMocks` on by default (new in Vitest 5) | Yes, nothing to configure                                   | Vitest clears every mock's call history before each test. A hook that only calls `vi.clearAllMocks()` does nothing.                                          |
| `test.for`                                   | Yes, for new tables                                         | It passes each row as one argument instead of spreading arrays, and it works with `test.extend` fixtures, which `it.each` does not.                          |
| `test.extend` fixtures                       | When a value needs cleanup or most tests in a file share it | Calling a factory inline is shorter for everything else. The builder form infers the fixture's type.                                                         |
| `projects`                                   | Already set up                                              | `vitest.config.ts` defines the six projects. Each sets `extends: false`, so a test option set at the root does not reach them: set it per project.           |
| `vi.mocked`                                  | Yes                                                         | It types a mocked import without a cast.                                                                                                                     |
| `vi.hoisted`                                 | Only for values a `vi.mock` factory references              | Vitest moves `vi.mock` above the imports, and rejects `vi.mock` and `vi.hoisted` calls outside the file's top level.                                         |
| `vi.mock(import('./module'), factory)`       | Yes, for partial module mocks                               | TypeScript checks the path and types `importOriginal`.                                                                                                       |
| `vi.spyOn`                                   | Yes, for one method of a real object                        | `vi.mock` replaces a whole module.                                                                                                                           |
| `mockThrow` and `mockThrowOnce`              | Yes                                                         | One line instead of a `mockImplementation` that throws.                                                                                                      |
| `vi.when` (new in Vitest 5)                  | Yes, for per-argument return values                         | It replaces `mockImplementation` callbacks that branch on their arguments, and matches arguments with deep equality.                                         |
| `unstubEnvs` and `unstubGlobals` config      | Yes, set in every project                                   | A stub from one test never reaches the next. Create stubs in `beforeEach` or in the test.                                                                    |
| `restoreMocks` config                        | Yes, set in every project                                   | Every `vi.spyOn` spy is restored before each test, so a spy created at module level or in `beforeAll` lasts for one test only. Create spies in `beforeEach`. |
| `expect.poll`                                | Yes, for a value that settles later                         | Since Vitest 5 it fails on timeout instead of passing on a late attempt. Use a fixed `setTimeout` sleep only to flush pending promises.                      |
| Snapshots, inline or file                    | No                                                          | A mapper's expected output belongs in the test where a reviewer reads it, and an updated snapshot rarely gets read.                                          |
| `expectTypeOf`                               | Yes, in `*.test-d.ts` files                                 | `pnpm typecheck` checks it like any other type error.                                                                                                        |
| Vitest `typecheck` mode                      | No                                                          | `pnpm typecheck` already checks the `*.test-d.ts` files, so it would add a second type-checking run without catching anything new.                           |
| `coverage.thresholds.autoUpdate`             | No                                                          | It rewrites `vitest.config.ts` on any local coverage run that beats the threshold. Raise the threshold by hand in the merge request that adds the tests.     |
| `coverage.changed`                           | Yes, before you push                                        | `--coverage.changed=origin/main` runs every test but reports coverage only for the files your branch changed.                                                |
| `agent` reporter                             | Nothing to configure                                        | Vitest switches to it when it detects a coding agent, and then prints only failures.                                                                         |
| `expect.soft`                                | No                                                          | A test that needs several independent checks is usually several tests.                                                                                       |
| `.concurrent`                                | No                                                          | Most files share module-level mocks between tests, so running a file's tests at the same time is unsafe.                                                     |
| Test tags                                    | No                                                          | The projects already split the suite by folder and environment.                                                                                              |
| `aroundEach` and `aroundAll`                 | No                                                          | Setup and cleanup pairs such as `vi.useFakeTimers` and `vi.useRealTimers` read clearly as `beforeEach` and `afterEach`.                                      |
