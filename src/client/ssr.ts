import type { Page, PageProps } from '@inertiajs/core'
import type { DefineComponent } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, h } from 'vue'
import type { Components, SSRRenderContext } from '@scayle/storefront'
import { createLogger, withModulePreloads } from '@scayle/storefront/shared'
import { traceSsrRender } from '@scayle/storefront-opentelemetry'
import Layout from '@client/layout/Layout.vue'
import SFOverlayHost from '@client/components/ui/core/SFOverlayHost.vue'
import { createNotificationPlugin } from '@client/plugins/notification'
import { createOverlayPlugin } from '@client/plugins/overlay'
import { createCmsPlugin } from '@cms-client/plugin'
import type { PageModule } from '@client/types'
import { createI18nInstance, getPageLocale } from '../i18n/config'
import { getLocaleMessages, getLocaleModuleId } from '../i18n/messagesServer'
import { createVueWarnHandler } from './utils/vueWarnHandler'
import { createSsrOrpcPlugin } from './plugins/orpcServer'
import { createConsentManagerPlugin } from './plugins/consentManager'
import { createTrackingPlugin } from './plugins/tracking'
import { createAnalyticsPlugin } from './plugins/analytics'

const log = createLogger('ssr')

export default async function render(
  page: Page,
  ssrContext: SSRRenderContext | undefined,
) {
  if (!ssrContext) {
    throw new Error(
      'SSR render requires Hono context. ' +
        'Ensure the inertia middleware is configured correctly.',
    )
  }

  // Records which components this render drew, so `@scayle/storefront` can emit
  // `modulepreload` hints for their chunks. Created per render, never shared.
  const ssr = withModulePreloads(renderToString)

  // Every shared prop is optional here: the bare-bones Error page renders with
  // `excludeSharedProps`, so none of them is present on it. It carries the
  // active locale as its own `locale` page prop instead. Read through the
  // contract rather than Inertia's `Page['props']`, whose index signature
  // resolves any name — a typo included — to `unknown`.
  const pageProps = page.props as Partial<PageProps> &
    Partial<Pick<Components['Error'], 'locale'>>

  const locale = getPageLocale(pageProps)
  const i18n = createI18nInstance(locale, {
    [locale]: getLocaleMessages(locale),
  })

  const { head, body } = await createInertiaApp({
    page,
    // Wrap the Vue render so the observability platform shows it as a discrete
    // `vue_ssr_render` span (child of the existing `inertia_render`). The wrapper
    // also records output size as `vue.html_bytes`. See docs/observability.md.
    render: (app) => traceSsrRender(() => ssr.render(app)),
    resolve: (name: string) => {
      const pages = import.meta.glob<PageModule>('./pages/**/*.vue', {
        eager: true,
      })

      const module = pages[`./pages/${name}.vue`]
      if (!module) {
        throw new Error(`Page not found: ${name}`)
      }

      // Apply default layout unless the page explicitly declares one (including
      // an explicit `layout: undefined` opt-out, e.g. the bare-bones Error page).
      // Copy, don't assign: in dev the page module stays cached when only
      // `Layout.vue` changes, so an assigned layout would go stale.
      if (module.default && !('layout' in module.default)) {
        return { ...module.default, layout: Layout } as DefineComponent
      }

      return module.default
    },
    setup({ App, props, plugin }) {
      const app = createSSRApp({
        render: () => [h(App, props), h(SFOverlayHost)],
      })
      app.config.errorHandler = (err, _instance, info) => {
        log.error({ message: 'Vue SSR error', info, err })
      }
      app.config.warnHandler = createVueWarnHandler(log)

      return app
        .use(createCmsPlugin())
        .use(plugin)
        .use(i18n)
        .use(createNotificationPlugin())
        .use(createOverlayPlugin())
        .use(createConsentManagerPlugin(), {
          consentManagementRequired:
            pageProps.storefront?.country?.publicFields
              ?.consentManagementRequired ?? false,
        })
        .use(createSsrOrpcPlugin({ context: ssrContext }))
        .use(createTrackingPlugin())
        .use(createAnalyticsPlugin())
    },
  })

  // The render records components only. The browser entry cannot mount before
  // the locale file's chunk has loaded, so it gets a preload hint as well.
  return {
    head,
    body,
    modules: [...ssr.renderedModules(), getLocaleModuleId(locale)],
  }
}
