import type { Plugin } from 'vue'
import { vEditable } from './directives/editable'

/**
 * Creates the CMS plugin for the Storyblok provider. Registers the `v-editable`
 * directive globally. The directive is a no-op outside editor sessions, so
 * registration is unconditional. The Visual Editor live-preview bridge is
 * attached separately by `useStoryblokEditor`.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/storyblok
 */
export const createCmsPlugin = (): Plugin => ({
  install(app) {
    app.directive('editable', vEditable)
  },
})
