import type { Plugin } from 'vue'

/**
 * Creates the CMS plugin for the Contentful provider. Contentful Live Preview
 * is initialized lazily in `useContentfulEditor()` via dynamic import, so this
 * plugin is a no-op placeholder that matches the provider interface contract.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/contentful
 */
export const createCmsPlugin = (): Plugin => ({
  install() {},
})
