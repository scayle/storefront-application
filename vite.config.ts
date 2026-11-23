import fs from 'node:fs'
import path from 'node:path'
import type { Buffer } from 'node:buffer'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import storefrontDevtools from '@scayle/storefront-devtools'
import tailwindcss from '@tailwindcss/vite'
import storefrontBuild from '@scayle/storefront-build'
import { defaultPathFilter } from '@scayle/storefront-opentelemetry'
import { opentelemetryPlugin } from '@scayle/storefront-opentelemetry/vite'
import { bundleAnalyzerPlugin } from 'rolldown/experimental'
import { z } from 'zod'
import { isCustomWebComponent } from './config/customWebComponents.ts'

const INTER_LATIN_FONT_PATTERN = /^inter-latin-wght-normal/
const LOCALE_FILE_PATTERN = /^src\/i18n\/locales\/.+\.json$/

/**
 * Loads local TLS certificates for the dev server.
 *
 * HTTPS is mandatory for local development: the storefront relies on browser
 * features that need a secure context, and the dev scheme carries into every
 * absolute URL the server emits. Failing here surfaces the problem at startup
 * instead of letting it leak into rendered pages.
 *
 * @see README.md for instructions on generating certificates with mkcert
 * @returns TLS options for the Vite dev server.
 * @throws When either certificate file is missing.
 */
function loadLocalCertificates(env: Record<string, string>): {
  key: Buffer
  cert: Buffer
} {
  const certPath = path.resolve(
    import.meta.dirname,
    env.HTTPS_CERT?.trim() || 'certs/localhost.crt',
  )
  const keyPath = path.resolve(
    import.meta.dirname,
    env.HTTPS_KEY?.trim() || 'certs/localhost.key',
  )

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(
      `Local TLS certificates are required for the dev server (HTTPS only).\n` +
        `Expected:\n  cert: ${certPath}\n  key:  ${keyPath}\n` +
        `Generate them via mkcert (see README.md → "Local HTTPS") or override the paths via HTTPS_CERT / HTTPS_KEY in .env.`,
    )
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }
}

function hashCode(str: string) {
  let hash = 0
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

const svgoConfig = {
  plugins: [
    {
      name: 'preset-default',
    },
    { name: 'removeDimensions' },
    {
      name: 'prefixIds',
      params: {
        prefix(_node: unknown, info: { path?: string }) {
          return `i${hashCode(info.path ?? '')}`
        },
      },
    },
    /** @see https://svgo.dev/docs/plugins/addAttributesToSVGElement/ */
    {
      name: 'addAttributesToSVGElement',
      params: {
        attributes: [{ 'aria-hidden': 'true' }],
      },
    },
    /** @see https://svgo.dev/docs/plugins/convertColors/ */
    {
      name: 'convertColors',
      params: {
        currentColor: '#171717',
        names2hex: true,
        rgb2hex: true,
        shorthex: true,
        shortname: true,
      },
    },
  ],
}

export default defineConfig(({ command, mode, isSsrBuild }) => {
  // `vite.config` runs before Vite populates `process.env` from `.env`.
  // Load env for the active mode here so HTTPS paths are available in config evaluation.
  const env = loadEnv(mode, import.meta.dirname, '')
  // Certs are only loaded when actually starting the application's dev server
  // (`vite serve` / `pnpm dev`). Production builds (`vite build`, `vite build
  // --ssr`), Vitest runs, Storybook, and CI environments (including static
  // analysis tools like knip, which probes this config with every possible
  // command/mode combination) also evaluate this config but never serve the
  // storefront over HTTPS, so they would otherwise fail without TLS material.
  const isDevServer =
    command === 'serve' &&
    mode !== 'test' &&
    !process.env.VITEST &&
    !process.env.STORYBOOK &&
    !process.env.CI
  const httpsOptions = isDevServer ? loadLocalCertificates(env) : undefined
  // An unknown or empty value would otherwise surface as a missing-directory error
  // from the `@cms-*` aliases below.
  const cmsProviderResult = z
    .object({
      CMS_PROVIDER: z
        .enum([
          'scayle',
          'storyblok',
          'contentful',
          'contentstack',
          'amplience',
        ])
        .default('scayle'),
    })
    .safeParse(env)
  if (!cmsProviderResult.success) {
    throw new Error(
      `Invalid build environment:\n${z.prettifyError(cmsProviderResult.error)}`,
    )
  }
  const cmsProvider = cmsProviderResult.data.CMS_PROVIDER
  // Opt-in production bundle analysis. `ANALYZE_BUNDLE` is a build-time CLI flag
  // (e.g. `ANALYZE_BUNDLE=true pnpm build`), not tenant config, so it is read from
  // `process.env` directly and stays out of `loadEnv` / `envPrefix`.
  const analyzeBundle = process.env.ANALYZE_BUNDLE === 'true'

  return {
    server: {
      port: 3000,
      ...(httpsOptions ? { https: httpsOptions } : {}),
      // Pin the HMR WebSocket to the dev server's HTTPS port so the
      // browser polls a stable URL across restarts. Without this, Vite
      // picks an internal port that can shift on restart, leaving the
      // browser's `@vite/client` polling a dead socket until a hard reload.
      hmr: {
        protocol: 'wss',
        host: 'localhost',
        clientPort: 3000,
      },
    },
    plugins: [
      svgLoader({
        defaultImport: 'component',
        // SVGO accepts this shape at runtime; vite-svg-loader types reference strict svgo Config
        svgoConfig: svgoConfig as NonNullable<
          Parameters<typeof svgLoader>[0]
        >['svgoConfig'],
      }),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: isCustomWebComponent,
          },
        },
      }),
      // Vite DevTools dock with the SCAYLE Storefront panels (Inertia, oRPC,
      // Storefront context) and an embedded Vue DevTools panel. It self-gates to
      // the dev server and drops out of production builds, so it needs no env
      // flag and no separate `vite-plugin-vue-devtools`.
      ...storefrontDevtools(),
      tailwindcss(),
      storefrontBuild({
        serverEntry: './src/server/index.ts',
        ssrEntry: './src/client/ssr.ts',
        indexEntry: './src/client/index.html',
        preloadFonts: [INTER_LATIN_FONT_PATTERN],
        // `ssr.ts` reports the active locale file, which `main.ts` loads
        // before it mounts.
        preloadModules: [LOCALE_FILE_PATTERN],
      }),
      opentelemetryPlugin({ filterPath: defaultPathFilter }),
      // Opt-in bundle analysis via Rolldown's built-in analyzer. The `plugins`
      // array is shared by the SSR and client builds, so the filename branches
      // on `isSsrBuild`. Each report is emitted into that build's output dir
      // (`.output/public` for client, `.output/server` for SSR). Markdown is
      // human and LLM readable without any external viewer.
      // @see https://rolldown.rs/builtin-plugins/bundle-analyzer#bundle-analyzer-plugin
      ...(analyzeBundle
        ? [
            bundleAnalyzerPlugin({
              fileName: `bundle-analysis-${isSsrBuild ? 'ssr' : 'client'}.md`,
              format: 'md',
            }),
          ]
        : []),
    ],
    ssr: {
      // isomorphic-dompurify contains browser-specific DOMPurify code that
      // cannot be bundled for SSR. Keeping it external allows it to use its
      // own Node.js compatibility layer when running on the server.
      // @valkey/valkey-glide loads a platform-specific native `.node` binary,
      // which the bundler cannot parse.
      external: ['isomorphic-dompurify', '@valkey/valkey-glide'],
    },
    resolve: {
      alias: {
        // `@contentstack/core` pulls in the full CommonJS `lodash` (~533 kB,
        // the single largest client chunk) just to use `cloneDeep`. Redirecting
        // to the ESM `lodash-es` lets the bundler tree-shake it down to that one
        // function. Both share the same API, so the swap is transparent.
        lodash: 'lodash-es',
        '@assets': '/src/client/assets',
        '@client': '/src/client',
        '@shared': '/src/shared',
        '@server': '/src/server',
        '@cms-server': `/src/server/cms/providers/${cmsProvider}`,
        '@cms-client': `/src/client/cms/providers/${cmsProvider}`,
        '@cms-shared': `/src/shared/types/cms/${cmsProvider}`,
      },
    },
    build: {
      /** Do not ship client source maps in production (security / audit). */
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const cmsChunks: Record<string, string[]> = {
              'cms-contentful': [
                'contentful',
                '@contentful/live-preview',
                '@contentful/rich-text-html-renderer',
              ],
              'cms-storyblok': [
                '@storyblok/js',
                '@storyblok/preview-bridge',
                'storyblok-js-client',
                '@storyblok/richtext',
              ],
              // `@contentstack/live-preview-utils` is intentionally NOT grouped
              // here. It is the editor-only Visual Builder, dynamically imported
              // and gated behind `cmsEditorData` in `useContentstackEditor.ts`.
              // Grouping it would force it into this eager content chunk and
              // ship it to every visitor; leaving it out lets the dynamic import
              // emit it as a lazy chunk loaded only in preview/editor sessions.
              'cms-contentstack': ['@contentstack/delivery-sdk'],
            }

            if (!id.includes('/node_modules/')) {
              return undefined
            }

            for (const [chunkName, dependencies] of Object.entries(cmsChunks)) {
              if (dependencies.some((dependency) => id.includes(dependency))) {
                return chunkName
              }
            }

            return undefined
          },
        },
      },
    },
  }
})
