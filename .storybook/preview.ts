import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { mocked, sb } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StorefrontContext } from '@scayle/storefront'
import { createI18nInstance } from '../src/i18n/config'
import { localeMessages } from '../src/i18n/messagesServer'
import { createNotificationPlugin } from '../src/client/plugins/notification'
import { createOverlayPlugin } from '../src/client/plugins/overlay'
import SFOverlayHost from '../src/client/components/ui/core/SFOverlayHost.vue'
import { RPC_CLIENT_KEY } from '../src/client/utils/orpc'
import { getSources } from '../src/client/cms/shared/image'
import { createStoryblokSources } from '../src/client/cms/providers/storyblok/utils/media'
import { storybookRpcClient } from './rpc-mock'
import { storybookCountries, unitedStatesShops } from './shop-mock'

import './preview.css'

// Storyblok stories use images from `.storybook/assets/`, and the static server
// has no Storyblok Image Service to answer the `/m/` URLs the sources point at.
// If you delete the Storyblok provider, remove this mock, the
// `createStoryblokSources` import and its override in `beforeEach`.
sb.mock(import('../src/client/cms/providers/storyblok/utils/media.ts'), {
  spy: true,
})

const storefront = {
  country: {
    name: 'United States',
    locale: 'en-US',
    countryCode: 'US',
    currency: { currencyCode: 'USD' },
    shopCountryId: 1,
    domain: 'example.com',
    path: '/en',
    isDefault: true,
  },
  config: {
    tenantSpace: 'example',
    shopKey: 'example',
    countrySelector: 'domain',
  },
} as unknown as StorefrontContext

setup((app) => {
  app.use(createI18nInstance('en-US', localeMessages))
  app.use(createNotificationPlugin())
  app.use(createOverlayPlugin())
  app.provide(RPC_CLIENT_KEY, storybookRpcClient)
  app.use({
    install(app) {
      Object.defineProperty(app.config.globalProperties, '$page', {
        get: () => {
          return {
            props: {
              storefront,
            },
          }
        },
      })
    },
  })
})

const preview: Preview = {
  decorators: [
    (story, { globals }) => ({
      components: { story, SFOverlayHost },
      setup() {
        const { locale } = useI18n()
        // A toolbar change updates `globals` in place without re-running
        // this setup, so the locale has to follow it reactively.
        watchEffect(() => {
          locale.value = globals.locale
        })
      },
      // Renders the overlays a story opens, as `main.ts` does next to the app.
      template: '<story /><SFOverlayHost />',
    }),
  ],
  beforeEach: () => {
    const page = {
      url: '/',
      props: {
        storefront,
        // A signed-out user, so `<Deferred data="customer">` renders its content.
        // Leave it `undefined` in a story to show the loading state.
        customer: null,
        availableCountries: storybookCountries,
        availableLanguages: unitedStatesShops,
      },
      version: null,
      scrollRegions: [],
      rememberedState: {},
      resolvedErrors: {},
    }
    // @ts-expect-error -- We know it's a mock
    mocked(usePage).mockReturnValue(page)
    mocked(createStoryblokSources).mockImplementation((url, viewportFraction) =>
      getSources(url, viewportFraction, (sourceUrl) => sourceUrl),
    )
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            // The product card image strip stays out of the tab order, so the
            // rule skips it and still checks every other scroll container. It
            // is a deliberate trade-off rather than a false positive: keyboard
            // users reach the product through the card's title link but cannot
            // scroll to its other images, and a tab stop per card would add one
            // stop per product to every listing page.
            // `select, textarea` repeats axe's own default selector for this
            // rule. The exclusion matches on `data-testid`, so renaming it
            // brings the violation back.
            // A story-level `a11y.config.rules` replaces this array, so repeat
            // the entry there if the story renders the image strip.
            id: 'scrollable-region-focusable',
            selector:
              '*:not(select, textarea, [data-testid="image-strip"] > ul)',
          },
        ],
      },
    },
    controls: {
      // These controls automatically match properties to a better fitting control.
      // e.g. props with color will be displayed as a color picker.
      matchers: {
        color: /(background|color)$/i,
        date: /Date$|timeUntil$/i,
      },
    },
    backgrounds: {
      options: {
        light: { name: 'light', value: '#ffffff' },
        gray: { name: 'gray', value: '#f2f2f2' },
        dark: { name: 'dark', value: '#171717' },
      },
    },
    options: {
      // Orientation first, then the primitives every page builds on, then the
      // commerce groups in the order a user meets them in the shop. The CMS
      // groups come last because a shop keeps only one provider. Unlisted groups
      // land at `*`. `alphabetical` sorts components inside a group; stories
      // inside one file keep their export order.
      storySort: {
        method: 'alphabetical',
        order: [
          'Getting Started',
          'Assets',
          'UI',
          ['Core', 'Form'],
          'Search',
          'Category',
          'Filter',
          'Sorting',
          'Image View',
          'Product',
          'Deal',
          'Wishlist',
          'Basket',
          'Order Success',
          'Account',
          '*',
          'CMS Amplience',
          'CMS Contentful',
          'CMS Contentstack',
          'CMS Storyblok',
        ],
      },
    },
  },
  globalTypes: {
    locale: {
      description: 'Locale of the translated text',
      toolbar: {
        icon: 'globe',
        items: Object.keys(localeMessages),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'light' },
    locale: 'en-US',
  },
  tags: ['autodocs'],
}

export default preview
