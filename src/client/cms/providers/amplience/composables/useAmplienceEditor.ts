import { getCurrentInstance, onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'
import { usePage } from '@client/composables/usePage'
import type { CDv2Response } from 'dc-visualization-sdk'
import type { CMSPageData } from '@shared/types/cms/amplience'
import { createLogger } from '@scayle/storefront/shared'

const log = createLogger('cms')

/**
 * One connection per frame, shared by every subscriber.
 *
 * `init()` opens a `message-event-channel` handshake to the Dynamic Content app,
 * unlike Contentful's static singleton, and a listing page mounts the page
 * component twice (teaser above the grid, SEO below). Two handshakes to the same
 * parent frame race, so one of the two subscribers would lose its connection.
 */
let sdkConnection:
  ReturnType<typeof import('dc-visualization-sdk').init> | undefined

const connect = async () => {
  const { init } = await import('dc-visualization-sdk')

  sdkConnection ??= init()

  try {
    return await sdkConnection
  } catch (error) {
    // Do not cache a failed handshake: a later mount inside a real content form
    // should get a fresh attempt.
    sdkConnection = undefined
    throw error
  }
}

/**
 * Initializes the Amplience visualization SDK for editor mode.
 *
 * Amplience renders the storefront in an iframe inside the Dynamic Content
 * content form and serves it from a Virtual Staging Environment, so preview
 * already works without any client-side code: the iframe reloads on save and the
 * server reads the draft. This subscribes to `form.changed` on top of that, so an
 * editor sees each keystroke without saving first, matching the other three
 * providers.
 *
 * The editor session is detected from `cmsEditorData` on the Inertia shared page
 * props, which the server sets only for editor requests, so callers do not pass a
 * preview flag down the component tree.
 *
 * The form model arrives wrapped as `{ content }`, and that `content` is the same
 * shape as delivery content (`format: 'inlined'` and `depth: 'all'` are the SDK
 * defaults), with `_meta` and hydrated child content. The server payload is the
 * content body itself, so the envelope is unwrapped before assigning.
 *
 * The SDK only emits while the form holds valid content, so a required field left
 * empty mid-edit keeps the last valid state on screen rather than clearing the page.
 *
 * Every caller shares one SDK connection, and the subscription is cleaned up on
 * unmount, including when the component goes away before the handshake resolves.
 *
 * @param pageData Reactive reference to the Amplience page payload to keep in sync
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/amplience
 */
export const useAmplienceEditor = (pageData: Ref<CMSPageData>): void => {
  const instance = getCurrentInstance()
  const { cmsEditorData } = usePage().props

  onMounted(async () => {
    if (!cmsEditorData) {
      return
    }

    let unsubscribe: (() => void) | undefined
    let unmounted = false

    // Register cleanup synchronously before the async import so the hook is
    // attached to a live instance even if the user navigates away. It can run
    // before the handshake resolves, which is what `unmounted` covers.
    onBeforeUnmount(() => {
      unmounted = true
      unsubscribe?.()
    }, instance)

    try {
      const sdk = await connect()

      if (unmounted) {
        return
      }

      unsubscribe = sdk.form.changed<CDv2Response<CMSPageData>>((model) => {
        // The generic is an assertion, not a validation, and blanking the page
        // is worse than holding the last valid state.
        if (model?.content) {
          pageData.value = model.content
        }
      })
    } catch (error) {
      // `init()` rejects when the page is not embedded in a content form, which
      // is the case for a visualization opened in its own browser tab. Preview
      // still renders, it just stops updating as the editor types.
      log.error({
        message: 'Failed to initialize the Amplience visualization SDK',
        err: error instanceof Error ? error : new Error(String(error)),
      })
    }
  })
}
