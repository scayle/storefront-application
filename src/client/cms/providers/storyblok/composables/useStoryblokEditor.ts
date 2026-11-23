import { onMounted } from 'vue'
import type { Ref } from 'vue'
import { usePage } from '@client/composables/usePage'
import type { CMSPageData } from '@shared/types/cms/storyblok'
import { createLogger } from '@scayle/storefront/shared'

const log = createLogger('cms')

/**
 * Starts the Storyblok Visual Editor live-preview bridge in editor sessions.
 *
 * The editor session is detected from `cmsEditorData` on the Inertia shared page
 * props, which the server sets only for editor requests, so callers do not pass
 * a preview flag down the component tree.
 *
 * `@storyblok/js` is dynamically imported so it stays out of the eager bundle.
 * `loadStoryblokBridge()` injects the bridge script and sets up
 * `window.storyblokRegisterEvent`, which `useStoryblokBridge()` requires, so it
 * must run first. The bridge listens for editor updates and mutates the story
 * data ref. No `onUnmounted` cleanup is needed: `useStoryblokBridge` returns
 * `void` and provides no unsubscribe API, and listeners are scoped to editor
 * sessions via the `_storyblok` query parameter.
 *
 * @param pageData Story data ref to mutate on editor updates
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/storyblok
 */
export const useStoryblokEditor = (
  pageData: Ref<CMSPageData | undefined>,
): void => {
  const { cmsEditorData } = usePage().props

  onMounted(async () => {
    if (!cmsEditorData || !pageData.value?.story?.id) {
      return
    }

    const storyId = pageData.value.story.id

    try {
      const { loadStoryblokBridge, useStoryblokBridge } =
        await import('@storyblok/js')

      await loadStoryblokBridge()
      useStoryblokBridge(
        storyId,
        (updatedStory) => {
          pageData.value = {
            story: updatedStory as CMSPageData['story'],
          }
        },
        {
          resolveLinks: 'url',
          preventClicks: true,
        },
      )
    } catch (error) {
      log.error({
        message: 'Failed to initialize Storyblok Visual Editor bridge',
        err: error instanceof Error ? error : new Error(String(error)),
      })
    }
  })
}
