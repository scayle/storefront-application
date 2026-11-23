import type { Plugin } from 'vue'

/**
 * No-op CMS plugin for the Amplience provider.
 *
 * The plugin has nothing to install. The live preview connection to the Dynamic
 * Content app is made by `useAmplienceEditor` in the page components, and
 * in-editor field annotation happens through plain `data-amplience-*` attributes
 * on the rendered markup, so there is no directive to register. On save, the
 * Dynamic Content app reloads the iframe, and the server serves that request from
 * the Virtual Staging Environment with the cache bypassed.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/amplience
 */
export const createCmsPlugin = (): Plugin => ({
  install() {},
})
