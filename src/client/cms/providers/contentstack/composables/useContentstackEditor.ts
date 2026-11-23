import { getCurrentInstance, onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import type { CMSPageData } from '@shared/types/cms/contentstack'
import { createLogger } from '@scayle/storefront/shared'

const log = createLogger('cms')

/**
 * Initializes Contentstack Live Preview for editor mode.
 * Dynamically imports `@contentstack/live-preview-utils` on mount and subscribes
 * to entry changes. When content is updated in the Contentstack editor, triggers
 * an Inertia partial reload to re-fetch the page data server-side.
 *
 * Uses `ssr: false` intentionally so `onEntryChange` works (CSR mode).
 * In SSR mode, the SDK would trigger full iframe reloads instead,
 * which provides worse UX than partial Inertia reloads.
 *
 * Cleans up the subscription on unmount to prevent memory leaks.
 *
 * The editor session is detected from `cmsEditorData` on the Inertia shared page
 * props, which the server sets only for editor requests, so callers do not pass
 * a preview flag down the component tree. The same object carries the
 * provider-specific `apiKey` (the public stack API key), `environment`,
 * `branch`, and `appHost` fields.
 *
 * @param pageData Reactive reference to the Contentstack page data
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/contentstack
 */
export const useContentstackEditor = (
  pageData: Ref<CMSPageData | undefined>,
): void => {
  const instance = getCurrentInstance()
  const { cmsEditorData } = usePage().props

  onMounted(async () => {
    if (!cmsEditorData || !pageData.value?.entry) {
      return
    }

    let callbackId: string | undefined
    let livePreview:
      (typeof import('@contentstack/live-preview-utils'))['default'] | undefined

    // Register cleanup synchronously before the async import so the hook
    // is attached to a live instance even if the user navigates away.
    onBeforeUnmount(() => {
      if (callbackId && livePreview) {
        livePreview.unsubscribeOnEntryChange(callbackId)
      }
    }, instance)

    try {
      const { default: ContentstackLivePreview } =
        await import('@contentstack/live-preview-utils')

      livePreview = ContentstackLivePreview

      await ContentstackLivePreview.init({
        enable: true,
        ssr: false,
        mode: 'builder',
        stackDetails: {
          apiKey: cmsEditorData.apiKey as string,
          environment: cmsEditorData.environment ?? '',
          branch: cmsEditorData.branch,
        },
        // Show the floating "Edit" pencil overlay on hovered fields. Excludes
        // elements outside the Live Preview portal so storefront chrome (header,
        // footer) stays clean.
        editButton: {
          enable: true,
          exclude: ['outsideLivePreviewPortal'],
        },
        // Regional Contentstack application host for the Visual Builder
        // "open in Contentstack" deep-link. Resolved server-side.
        clientUrlParams: {
          host: cmsEditorData.appHost as string,
        },
      })

      callbackId = ContentstackLivePreview.onEntryChange(() => {
        router.reload({ only: ['pageData'] })
      })
    } catch (error) {
      log.error({
        message: 'Failed to initialize Contentstack Live Preview',
        err: error,
      })
    }
  })
}
