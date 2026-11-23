import type { DefineComponent } from 'vue'
import { createInertiaApp, router } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import { createSSRApp, h } from 'vue'
import type { Components } from '@scayle/storefront'
import type { PageProps } from '@shared/types/PageProps'
import { useI18n } from 'vue-i18n'
import { createLogger } from '@scayle/storefront/shared'
import Layout from '@client/layout/Layout.vue'
import SFOverlayHost from '@client/components/ui/core/SFOverlayHost.vue'
import { createConsentManagerPlugin } from '@client/plugins/consentManager'
import { createNotificationPlugin } from '@client/plugins/notification'
import { createOverlayPlugin } from '@client/plugins/overlay'
import { createAnalyticsPlugin } from '@client/plugins/analytics'
import { createTrackingPlugin } from '@client/plugins/tracking'
import { createUserCentricsAdapterPlugin } from '@client/plugins/userCentricsAdapter'
import { createCmsPlugin } from '@cms-client/plugin'
import type { PageModule } from '@client/types'
import { createI18nInstance, getPageLocale } from '../i18n/config'
import type { MessageSchema } from '../i18n/config'
import { loadLocaleMessages } from '../i18n/messagesBrowser'
import { createVueWarnHandler } from './utils/vueWarnHandler'
import { createBrowserOrpcPlugin } from './plugins/orpcBrowser'
import { useToast } from './composables/useToast'
import {
  handleHttpException,
  partialReload,
  preserveUrlOnDeferredReload,
} from './utils/router'
import { pushGtmStartEvent } from './utils/gtmBootstrap'
import { markNavigated } from './utils/initialRender'

const log = createLogger('main')

/**
 * Flag to detect history navigation (back/forward buttons).
 * When true, the next navigate event should reload shared mutable props
 * that may have changed via oRPC mutations on other pages.
 */
let staleHistoryNavigation = false

window.addEventListener('popstate', () => {
  staleHistoryNavigation = true
})

// GTM bootstrap: see `pushGtmStartEvent`. Called here, at the top of the client
// entry, rather than inside a Vue plugin so a page chunk that fails to resolve
// cannot silence every tag on the `gtm.js` trigger.
pushGtmStartEvent()

void createInertiaApp({
  // Default delay of 250ms leaves many mobile navigations with no feedback at all
  // before the swap happens. 75ms surfaces the bar almost immediately without
  // flashing on cached/instant navigations. The bar is styled in `index.css`:
  // Inertia would otherwise inject its CSS as an inline `<style>` block, which
  // the Content-Security-Policy's `style-src` does not allow.
  progress: {
    delay: 75,
    includeCSS: false,
  },
  defaults: {
    visitOptions: preserveUrlOnDeferredReload,
  },
  resolve: async (name: string) => {
    const pages = import.meta.glob<PageModule>('./pages/**/*.vue', {
      eager: false,
    })

    const resolver = pages[`./pages/${name}.vue`]
    if (!resolver) {
      throw new Error(`Page not found: ${name}`)
    }

    const module = await resolver()

    // Apply default layout unless the page explicitly declares one (including
    // an explicit `layout: undefined` opt-out, e.g. the bare-bones Error page).
    if (module.default && !('layout' in module.default)) {
      module.default.layout = Layout as unknown as DefineComponent
    }

    return module.default
  },
  setup({ el, App, props, plugin }) {
    // Every shared prop is optional here: the bare-bones Error page renders
    // with `excludeSharedProps`, so none of them is present on it. It carries
    // the active locale as its own `locale` page prop instead.
    const pageProps = props.initialPage.props as Partial<PageProps> &
      Partial<Pick<Components['Error'], 'locale'>>
    const locale = getPageLocale(pageProps)
    // Starts without messages. They are registered right before mount, below.
    const i18n = createI18nInstance(locale, {})

    const app = createSSRApp({
      setup() {
        const { t } = useI18n()
        const page = usePage()
        const toast = useToast()

        router.on('httpException', (event) =>
          handleHttpException(event, page, toast, {
            message: t('notification.error.http_exception'),
            reload: t('notification.reload'),
          }),
        )
        router.on('networkError', (event) => {
          event.preventDefault()
          toast.show(t('notification.error.network_error'), {
            type: 'ERROR',
            action: 'ROUTE',
            to: page.url,
            text: t('notification.reload'),
          })
        })

        /**
         * Reload shared mutable props on history navigation.
         * Props like basket and wishlist can change via oRPC mutations on other pages.
         * Inertia restores cached props from history, so we reload to get fresh data.
         * Using `only` preserves page-local state (filters, sort, pagination).
         *
         * @see https://github.com/inertiajs/inertia/issues/565
         */
        router.on('navigate', () => {
          markNavigated()

          if (!staleHistoryNavigation) {
            return
          }
          staleHistoryNavigation = false

          // Shared mutable props that can change via oRPC on any page
          void partialReload(['basket', 'wishlist', 'customer', 'promotions'])
        })
      },
      render: () => [h(App, props), h(SFOverlayHost)],
    })
    app.config.errorHandler = (err, _instance, info) => {
      log.error({ message: 'Vue client error', info, err })
    }
    app.config.warnHandler = createVueWarnHandler(log)

    app
      .use(createCmsPlugin())
      .use(plugin)
      .use(i18n)
      .use(createNotificationPlugin())
      .use(createOverlayPlugin())
      .use(createConsentManagerPlugin(), {
        consentManagementRequired:
          pageProps.storefront?.country.publicFields
            ?.consentManagementRequired ?? false,
      })
      .use(createUserCentricsAdapterPlugin())
      .use(createTrackingPlugin())
      .use(createAnalyticsPlugin())

    // The oRPC client reads the storefront shared prop for its request headers.
    // Register it only when storefront context is present so the bare-bones
    // Error page (which makes no RPC calls) still renders without one.
    if (pageProps.storefront !== undefined) {
      app.use(createBrowserOrpcPlugin(pageProps.storefront))
    }

    // Hydration has to render the text the server rendered, so the app mounts
    // only once the locale's messages are registered. The page carries a
    // `modulepreload` hint for their chunk (see `ssr.ts`), so this rarely waits
    // on the network.
    const mountWithMessages = async () => {
      let messages: MessageSchema
      // Wraps the load alone, so an error thrown while mounting is not logged
      // as a failed load.
      try {
        messages = await loadLocaleMessages(locale)
      } catch (err) {
        log.error({
          message:
            'Failed to load the locale messages, so the app did not mount',
          locale,
          err,
        })
        return
      }

      i18n.global.setLocaleMessage(locale, messages)
      app.mount(el)
    }
    void mountWithMessages()
  },
})
