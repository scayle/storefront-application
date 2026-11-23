import type { Plugin } from 'vue'

/**
 * No-op CMS plugin for the Scayle default provider.
 * The Scayle provider has no visual editor directives to register.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms
 */
export const createCmsPlugin = (): Plugin => ({
  install() {},
})
