---
name: vue-testing-best-practices
version: 1.0.0
license: MIT
author: github.com/vuejs-ai
description: V3 boilerplate testing configuration and project-specific patterns.
---

Testing conventions for the Storefront Application V3.

See `src/client/CLAUDE.md` and `src/server/CLAUDE.md` for component testing and server testing practices (mount with happy-dom, stub children, mock vue-i18n, test utilities in `src/test/`).

**Full documentation**: [vitest.dev/llms.txt](https://vitest.dev/llms.txt) for the test runner; [test-utils.vuejs.org](https://test-utils.vuejs.org) for `@vue/test-utils` (no `llms.txt` published as of this writing).

## Vitest Projects

Five parallel test projects in `vitest.config.ts`:

1. **components** (`src/client/**/*.vue.test.ts`): Happy-dom environment for Vue component tests.
2. **client** (`src/client/**/*.test.ts`, not `.vue.test.ts`): Node environment for composables and utilities.
3. **shared** (`src/shared/**/*.test.ts`): Node environment for shared types and helpers.
4. **server** (`src/server/**/*.test.ts`): Node environment for controllers, services, mappers.
5. **runtime** (`storefront/**/*.test.ts`): Node environment for `@scayle/storefront` package tests.

Run a single project: `pnpm test --project=v3:boilerplate:components`.

## Test Environment Setup

- Vitest config provides `@test` alias pointing to `src/test/` for mock factories and shared test utilities.
- **Virtual module resolution**: `virtual:storefront-config` is aliased to `storefront.config.ts` in test mode (tests run outside Vite's plugin pipeline, so the virtual module is resolved directly).
- **Test env vars**: `vitest.config.ts` feeds `STOREFRONT_*` variables (API keys, session secret, country checkout credentials) into `process.env` during test runs.

## Async Components in SSR Context

Inertia deferred props and server-rendered pages with `<Suspense>` have a gotcha: testing async components that resolve during SSR may require manually wrapping them with a test `<Suspense>` component if the wrapper component is tested in isolation. Use `@vue/test-utils` `mount()` directly; `@testing-library/vue` has known issues with Suspense. For details, see the reference file on Suspense and async components.
