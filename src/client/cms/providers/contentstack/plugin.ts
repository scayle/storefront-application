import type { Plugin } from 'vue'
import { vLivePreview } from './directives/livePreview'

/**
 * Creates the CMS plugin for the Contentstack provider.
 * Registers the `v-live-preview` directive for Visual Builder `data-cslp` attributes.
 * Contentstack Live Preview is initialized lazily in `useContentstackEditor()`
 * via dynamic import, matching the Contentful provider pattern.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/contentstack
 */
export const createCmsPlugin = (): Plugin => ({
  install(app) {
    app.directive('live-preview', vLivePreview)
  },
})
