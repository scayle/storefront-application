# CLAUDE.md

Isomorphic server-driven monolith: one Node.js process (Node 26, pnpm 12) handles SSR pages and API mutations.

Stack: Hono, Inertia.js (no client-side routing), Vue 3 (`<script setup>`), Vite, Tailwind CSS v4, Zod + Regle, oRPC, vue-i18n, unstorage + Redis (sessions).

Use the terms in [docs/GLOSSARY.md](docs/GLOSSARY.md) in comments and docs. Check it before naming a SCAYLE concept.

## SDK imports

- `@scayle/storefront-api`: all Storefront API calls go through it.
- `@scayle/storefront`: server values (`createStorefrontRuntime()`, `mountSSRRouter`, `Inertia`, `Session`, `config`) and infra types (`StorefrontContext`, `MapperRegistry`, `ServiceRegistry`, Inertia prop types).
- `@scayle/storefront/{mappers,services,controllers}`: base classes and their own option and result types.
- `@scayle/storefront/types`: client-facing domain data types.
- `@scayle/storefront/config`: config types and `defineStorefrontConfig` (required in `storefront.config.ts`, avoids a circular `virtual:storefront-config` graph).
- `@scayle/storefront/client`: client-only helpers (checkout auth storage).
- `@scayle/storefront/shared`: isomorphic helpers (`createLogger`, link and URL helpers, listing and pagination helpers).
- `@scayle/storefront-build` and `@scayle/storefront-opentelemetry`: Vite plugins and middleware, used in `vite.config.ts` and `src/server/index.ts`.

Each SDK type has one canonical import path. `@shared/types/*` holds only types this application owns plus the `declare module` augmentations of SDK types. It never re-exports an SDK type, and a domain with no application-owned type and no augmentation gets no module. No lint rule enforces this, review it. Shared type rules and augmentation mechanics: `src/shared/CLAUDE.md`.

## Observability

Span tree, attributes and queries: [docs/observability.md](docs/observability.md).

- `src/client/ssr.ts` wraps `renderToString` in `traceSsrRender` (the `vue_ssr_render` span) and `withModulePreloads` (the `modules` return, which drives `modulepreload` hints). Removing either silently drops the span or the hints on every page.
- A slow page or request: measure first. Use the `tracing` skill (`.claude/skills/tracing/`) and rank spans by duration.

## Architecture

```
Request → Hono middleware → sharedDataMiddleware → SSR Router → Controller → Service/Mapper → Inertia.render() → Vue SSR → HTML
```

- Routes are in `src/server/ssr-routes.ts`. Every pattern comes from `routes` in `@shared/routes`, so mounts and generated links share one source. With country selector `path` or `path_except_default`, routes mount under a country prefix. Adding a route: `src/server/CLAUDE.md`.
- `src/server/`: controllers, services, mappers, oRPC. `src/client/`: design system, components, composables. `src/shared/`: the server-client contract, only shared types cross the boundary. Details in each directory's CLAUDE.md.
- `Inertia.once` / `defer` / `serverOnly`: use the `inertia` skill. Application rules are in `src/server/CLAUDE.md` (Page prop rules) and `src/client/CLAUDE.md` (Pages & Layouts).
- V2 carryover: a branch or helper ported from V2 must justify its use case in V3. If a reviewer can ask "when is this the case?", the answer goes in the code or the branch goes. Tracking follows [docs/GA4-TRACKING.md](docs/GA4-TRACKING.md).
- Client code (composables, components) stays in the application, never in the SDK.
- CMS: each vendor is a package (`@scayle/storefront-cms-<provider>`). `src/server/cms/providers/<provider>/service.ts` is a thin subclass bound to the generated content types in `src/shared/types/cms/<provider>/` (regenerated per tenant with `pnpm cms:sync`). Controllers use `this.services.cms`, and the provider decides draft content itself. Provider-agnostic code imports the page payload type from `@cms-shared`, provider-specific code from `@shared/types/cms/<provider>` directly.

### Import boundaries

ESLint enforces these as errors:

- Client must not import `@server/*`, except `src/server/api/index.ts` for oRPC types.
- Server must not import `@client/*`.
- Shared must not import `@client/*` or `@server/*`.
- `import-x/no-cycle` (depth 5), `no-console`, and no `@scayle/storefront/test` or `vitest` outside test files.

Path aliases are in `tsconfig.json`. The three `@cms-*` aliases resolve to the `scayle` provider for typecheck and to `CMS_PROVIDER` at build time.

## Data fetching

Never run one API call, query or RPC per item in a collection when a batch operation exists. Batch results can come back fewer or reordered: index them in a `Map`, and handle missing IDs. Filter server-side (`products.query({ where })`) instead of fetching all and filtering in code.

## Testing

Vitest projects: components (`*.vue.test.ts`, happy-dom), client, shared, i18n, server, scripts (node). Rules: [docs/testing-guidelines.md](docs/testing-guidelines.md).

- Check for existing fixtures in the test file, `@test/*` and `@scayle/storefront/test` before writing a factory. A new factory takes a `Partial<T>` and returns a complete `T`.
- Use a typed factory instead of `as unknown as`. Use `vi.mocked(fn)` for mocked imports. Partial registry slots go through `createMockMapperRegistry` / `createMockServiceRegistry`.
- One behavior per test. Three or more tests differing only in data become one `test.for`. Don't assert the same behavior on two layers. No snapshots: use `toMatchObject` or `toEqual`.
- `vi.hoisted` only for values a `vi.mock` factory references. No hook that only calls `vi.clearAllMocks()`, Vitest 5 clears call history before each test.
- When tests raise coverage, raise the threshold in `vitest.config.ts` in the same MR, rounded down. Lower it only for deleted or untestable code, and say so in the MR.

## Quality workflow

- Format: `pnpm exec prettier --write <files>`. Lint: `pnpm exec eslint --fix <files>`.
- Typecheck: `pnpm typecheck`. `noUncheckedIndexedAccess` is on: guard `items[0]`, or use `!` with a short comment when provably in range. Tests may use `!` on fixture reads.
- Test: `pnpm exec vitest run <file>`, or `pnpm test` for all. Build before committing: `pnpm build`.

## i18n

- Locales are JSON in `src/i18n/locales/`. Author new keys in `en_GB.json` first, then run the `translate-locales` skill to propagate them to every locale. CI translates too, but tenant forks don't get that pipeline. Manual fixes to single translations are fine. ESLint fails CI on missing keys in other locales.
- Server code reads the `i18n` mapper slot (`mappers.i18n`). Client code calls `useI18n()`. Only `registries.ts` constructs `ServerI18nService`.
- Never import `messagesServer` in `src/client/` (except `ssr.ts`) or `src/shared/`, it ships every locale to every user. The browser loads one locale through `loadLocaleMessages`.
- A plural message picks its form from a number: `$t('key', count)`, or a named `count` or `n` that holds a number. A string value or any other name renders the first form. Server code passes `{ count: number }`, because `ServerI18nService.t` takes named values only.
- Subscription keys live under the top-level `subscription` namespace.

## Conventions

- Environment variables MUST be prefixed `STOREFRONT_`.
- The public documentation is indexed in `https://scayle.dev/llms.txt`. The pages for this application sit in its "Storefront Application V3" navigation sub-tree (`/documentation/storefront/storefront-application-v3/`). Look a page up there before linking it, never guess a slug.
- Design specs never mention V2. Write "legacy carryover" or "external contract stable across implementations". CLAUDE.md files may mention V2.
- Redis is required for sessions (`docker-compose up`, port 6379).
- Never hardcode another SCAYLE SDK's internals (auth storage keys, checkout protocol shapes, cookie names). Use `@scayle/storefront` helpers.
- `storefront.config.ts` is bundled into the SSR output via `virtual:storefront-config`. Production containers ship only `.output/` and must not read the file from disk.
