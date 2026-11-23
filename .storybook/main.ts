import { resolve } from 'node:path'
import type { StorybookConfig } from '@storybook/vue3-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['./content/GettingStarted.mdx', '../src/client/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/vue3-vite',
  features: {
    // Replaces the deprecated vue-docgen-api builder plugin.
    experimentalDocgenServer: true,
    componentsManifest: true,
  },
  core: {
    disableTelemetry: true,
    enableCrashReports: false,
    disableWhatsNewNotifications: true,
    disableProjectJson: true,
  },
  docs: {
    defaultName: 'Overview',
  },
  staticDirs: ['assets'],
  // Hides `DocsOnly` stories, which exist only so autodocs builds an Overview
  // page. Tagging them `!dev` would hide the Overview page as well.
  managerHead: (head) => `
    ${head}
    <style>a[id$="--docs-only"] { display: none; }</style>
  `,
  async viteFinal(config) {
    // Remove storefront build plugins that override input/output and break the Storybook build,
    // or write server output (`storefront-ssr-manifest` writes `server/ssr-manifest.json`).
    // `vite-plugin-inspect` would record every module's transform steps in memory, while
    // Storybook's preview page carries no dock, so nothing could show them.
    const excludedPlugins = [
      'storefront-build-ssr',
      'storefront-build-client',
      'storefront-build-id',
      'storefront-ssr-manifest',
      '@scayle/storefront-opentelemetry',
      'vite-plugin-inspect',
    ]
    // Flatten nested plugin arrays (Vite allows plugins to be nested in arrays)
    const flatPlugins = (config.plugins ?? []).flat()
    config.plugins = flatPlugins.filter((plugin) => {
      const name = (plugin as { name?: string })?.name ?? ''
      return !excludedPlugins.includes(name)
    })

    return mergeConfig(config, {
      resolve: {
        alias: [
          {
            find: '@inertiajs/vue3',
            replacement: resolve(process.cwd(), '.storybook/inertia-mock.ts'),
          },
        ],
      },
    })
  },
}

export default config
