import { getCurrentInstance, onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'
import { usePage } from '@client/composables/usePage'
import type { ContentfulEntry, CMSPageData } from '@shared/types/cms/contentful'
import { createLogger } from '@scayle/storefront/shared'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'

const log = createLogger('cms')

/**
 * Initializes Contentful Live Preview for editor mode.
 * Dynamically imports `@contentful/live-preview` on mount and subscribes
 * to entry updates so changes in the Contentful editor are reflected
 * in real time without a page reload.
 *
 * The editor session is detected from `cmsEditorData` on the Inertia shared page
 * props, which the server sets only for editor requests, so callers do not pass
 * a preview flag down the component tree.
 *
 * The SDK is subscribed with the resolved entry, so each live update carries
 * referenced entries inline, including edits to them. Links left in an update
 * are resolved client-side with `contentful-resolve-response` against the
 * `includes` from `previewSource` before rendering.
 *
 * Cleans up the subscription on unmount to prevent memory leaks.
 *
 * @param pageData Reactive reference to the Contentful page data to keep in sync
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/contentful
 */
export const useContentfulEditor = (
  pageData: Ref<CMSPageData | undefined>,
): void => {
  const instance = getCurrentInstance()
  const { country } = useStorefrontConfig()
  const { cmsEditorData } = usePage().props

  onMounted(async () => {
    const previewSource = pageData.value?.previewSource
    const entry = pageData.value?.entry

    if (!cmsEditorData || !previewSource?.entry || !entry) {
      return
    }

    let unsubscribe: (() => void) | undefined

    // Register cleanup synchronously before the async import so the hook
    // is attached to a live instance even if the user navigates away.
    onBeforeUnmount(() => unsubscribe?.(), instance)

    try {
      const [{ ContentfulLivePreview }, { default: resolveResponse }] =
        await Promise.all([
          import('@contentful/live-preview'),
          import('contentful-resolve-response'),
        ])

      const { includes } = previewSource

      // The locale must match the one used to fetch the entry server-side
      // (e.g. "de-DE"). The Live Preview SDK matches subscription updates by
      // locale, so a short code like "de" from document.documentElement.lang
      // would silently drop all field updates while inspector mode still works.
      await ContentfulLivePreview.init({
        locale: country.value.locale,
      })

      unsubscribe = ContentfulLivePreview.subscribe({
        // Pass the resolved entry: with the untransformed `previewSource.entry`,
        // updates carry referenced entries as links, which resolve against the
        // `includes` from page load and render a referenced entry's old content.
        data: entry,
        callback(update) {
          const [resolvedEntry] = resolveResponse<ContentfulEntry>({
            items: [update],
            includes,
          })

          if (resolvedEntry) {
            pageData.value = { ...pageData.value, entry: resolvedEntry }
          } else {
            // resolveResponse yields an empty array when the update references
            // an entry/asset absent from the frozen `includes` snapshot (e.g. a
            // reference added after page load). The update is dropped; surface it so the stalled
            // preview is diagnosable instead of silently broken.
            log.warn({
              message:
                'Contentful live update could not be resolved against the frozen includes snapshot; skipping update. A newly referenced entry may require a page reload.',
            })
          }
        },
      })
    } catch (error) {
      log.error({
        message: 'Failed to initialize Contentful Live Preview',
        err: error instanceof Error ? error : new Error(String(error)),
      })
    }
  })
}
