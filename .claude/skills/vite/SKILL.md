---
name: vite
description: V3 Vite configuration specifics. Use when working on vite.config.ts, build setup, or SSR configuration.
---

# Vite in Storefront Application V3

V3 uses Vite for both client and SSR builds with several project-specific plugins and configurations.

**Full documentation**: [vite.dev/llms.txt](https://vite.dev/llms.txt).

## Key Configuration Files

- `vite.config.ts` – Main Vite config, conditional on build type (serve, build, SSR)
- `.env` / `.env.local` – Environment variables (see HTTPS setup below)

## Dev Server (HTTPS + HMR)

The dev server MUST run over HTTPS because domain prefixes are hard-coded in `https://` URLs (shop-switcher, hreflang, canonical). A plaintext HTTP server would generate unreachable URLs that get shipped into rendered HTML.

**Before starting the dev server:**

1. Generate local TLS certificates using mkcert (see boilerplate README)
2. Place them in `certs/localhost.crt` and `certs/localhost.key`, or set `HTTPS_CERT` / `HTTPS_KEY` env vars

The config auto-detects dev server startup and loads certs only then (CI builds and Vitest skip cert loading).

HMR WebSocket is pinned to `wss://localhost:3000` to survive dev server restarts without stale socket polling.

## Plugins in Use

| Plugin                                         | Purpose                         | Notes                                                                                            |
| ---------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@vitejs/plugin-vue`                           | Vue SFC support                 | Custom compiler option: `isCustomElement` (Web Components detection)                             |
| `vite-svg-loader`                              | SVG as Vue components           | SVGO config removes dimensions, prefixes IDs, converts colors                                    |
| `vite-plugin-vue-devtools`                     | Dev overlay                     | Self-gates to dev server; uses `appendTo: 'src/client/main.ts'` to reach SSR-aware entry         |
| `@tailwindcss/vite`                            | Tailwind CSS v4                 | Tailwind CSS v4 Vite plugin (not the Tailwind preset)                                            |
| `@scayle/storefront-build`                     | Custom SSR/client/server builds | Bundles `storefront.config.*` as `virtual:storefront-config`; handles multipart HTML composition |
| `@scayle/storefront-opentelemetry/vite`        | OpenTelemetry Vite integration  | HTTP span instrumentation (paired with Hono middleware)                                          |
| `rolldown/experimental` `bundleAnalyzerPlugin` | Opt-in bundle analysis          | Activated by `ANALYZE_BUNDLE=true pnpm build` (Markdown reports in `.output/`)                   |

## Path Aliases

```ts
{
  '@client': '/src/client',       // Client components, composables, assets
  '@server': '/src/server',       // Controllers, services, mappers
  '@shared': '/src/shared',       // Shared types, constants, utilities
  '@assets': '/src/client/assets',
  '@cms-server': `/src/server/cms/providers/${CMS_PROVIDER}`,
  '@cms-client': `/src/client/cms/providers/${CMS_PROVIDER}`,
  '@cms-shared': `/src/shared/types/cms/${CMS_PROVIDER}`,
  'lodash': 'lodash-es',          // Swap CommonJS for ESM (tree-shaking)
}
```

CMS provider paths (`@cms-server`, `@cms-client`, `@cms-shared`) are resolved from `CMS_PROVIDER` env var at config time.

## SSR Build

The `ssr` config specifies external dependencies that should not be bundled for the server:

```ts
external: ['isomorphic-dompurify'] // Uses Node.js compat layer when server-side
```

## Client Build

### Manual Chunk Splitting

Vendor SDKs for CMS providers are grouped into separate chunks to avoid bundling unused ones:

```ts
cmsChunks: {
  'cms-contentful': ['contentful', '@contentful/live-preview', ...],
  'cms-storyblok': ['@storyblok/js', '@storyblok/preview-bridge', ...],
  'cms-contentstack': ['@contentstack/delivery-sdk'],
}
```

Note: `@contentstack/live-preview-utils` is intentionally NOT chunked (it is dynamically imported and editor-only).

### No Source Maps

`sourcemap: false` in production (security / audit policy).

## Environment Variables

The config reads from `process.env`:

- `HTTPS_CERT`, `HTTPS_KEY` – TLS certificate paths (dev server only)
- `CMS_PROVIDER` – One of `'scayle'`, `'contentful'`, `'storyblok'`, `'contentstack'`
- `ANALYZE_BUNDLE` – Set to `'true'` to emit bundle analysis (build time)

Vite's default `envPrefix` applies, so only `VITE_*` variables are exposed on `import.meta.env`. `STOREFRONT_*` and `OTEL_*` are read from `process.env` at runtime. Do not add them to `envPrefix`: Vite would inline every value with that prefix, secrets included, into the client bundle.

## Conditional Config

The config is a function receiving `{ command, mode, isSsrBuild }` and branches:

- `command === 'serve'` – Dev server (HTTPS enabled, HMR configured)
- `command === 'build'` – Production build
- `isSsrBuild === true` – SSR build (affects build output, bundle analyzer filename)

CI environments set `VITEST=1` or `STORYBOOK=1` to skip HTTPS cert loading.

## Custom Web Components

The Vue plugin's compiler option `isCustomElement` delegates to a project function that identifies custom elements. Update `config/customWebComponents.ts` when adding a new Web Component library to avoid Vue treating them as unknown components.
