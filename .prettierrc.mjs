import storefrontPrettierConfig from '@scayle/prettier-config-storefront'

/**
 * Prettier configuration for the Storefront Application V3 MVP.
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  ...storefrontPrettierConfig,
  plugins: ['prettier-plugin-tailwindcss'],
  // Without the stylesheet, the plugin sorts against the default theme and
  // misplaces classes defined in our `@theme` and `@utility` blocks.
  tailwindStylesheet: './src/client/index.css',
}

export default config
