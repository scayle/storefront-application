---
name: vitest
description: This boilerplate's Vitest project setup (six parallel projects, virtual module aliasing, test env vars). Use when running or configuring tests.
---

# Vitest in Storefront Application V3

See `CLAUDE.md`'s Testing section for the fixture-reuse rule and `src/client/CLAUDE.md`/`src/server/CLAUDE.md` for component/server testing conventions. This skill covers only the `vitest.config.ts` setup itself.

**Full documentation**: [vitest.dev/llms.txt](https://vitest.dev/llms.txt).

## Six parallel projects

Defined in `vitest.config.ts`, each with its own `test.dir` (discovery scope) and environment. Vite root stays the application directory so coverage `include` globs resolve against `src/**` and `scripts/**`.

| Project                     | Dir          | Files                                  | Environment |
| --------------------------- | ------------ | -------------------------------------- | ----------- |
| `v3:boilerplate:components` | `src/client` | `**/*.vue.test.ts`                     | happy-dom   |
| `v3:boilerplate:client`     | `src/client` | `**/*.test.ts` (excl. `.vue.test.ts`)  | node        |
| `v3:boilerplate:shared`     | `src/shared` | `**/*.test.ts`                         | node        |
| `v3:boilerplate:i18n`       | `src/i18n`   | `**/*.test.ts`                         | node        |
| `v3:boilerplate:server`     | `src/server` | `**/*.test.ts`                         | node        |
| `v3:boilerplate:scripts`    | `scripts`    | `**/*.test.ts` (excl. `cache.test.ts`) | node        |

Run a single project: `pnpm test --project=v3:boilerplate:server` (substitute any project name above).

## Virtual module and env var setup

- `virtual:storefront-config` is aliased directly to `storefront.config.ts` (`vitest.config.ts`'s `resolveAlias`) — in production this resolves through `@scayle/storefront-build`'s Vite plugin, but tests run outside Vite's plugin pipeline, so it's aliased to the real file instead.
- Each project sets `server: serverDeps` to inline `@scayle/storefront`. When the package comes from the registry (standalone project) instead of a workspace symlink, Vitest externalizes it and Node's ESM loader rejects its `virtual:storefront-config` import; inlining keeps it in Vite's pipeline where the alias applies. Gotcha: `server.deps` on the root `test` config is not inherited by `projects` entries — it silently changes nothing there, so it has to be set per project.
- `test.env` seeds `process.env` with fake `STOREFRONT_*` values (API key, OAuth credentials, per-country checkout credentials, session secret) so `storefront.config.ts` evaluates without real secrets during test runs.
- The Vue plugin used in the `components` project passes the same `isCustomElement: isCustomWebComponent` compiler option as `vite.config.ts` — update `config/customWebComponents.ts` in both places if adding a new custom element library, or component tests will warn about unknown elements that the real app doesn't.
