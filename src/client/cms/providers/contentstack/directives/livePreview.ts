import type { DirectiveBinding } from 'vue'
import type { SystemFields } from '@shared/types/cms/contentstack/gen/contentstack'

type LivePreviewData = {
  'data-cslp': never
  [key: string]: { 'data-cslp': string } | undefined
} & { 'data-cslp': string }

/**
 * Updates the live preview data attribute on the given element.
 *
 * @param el Element to update
 * @param binding Directive binding
 */
const updateLivePreviewData = <
  T extends SystemFields & { $?: LivePreviewData },
>(
  el: HTMLElement,
  binding: DirectiveBinding<T, 'loop', string | undefined>,
) => {
  // If the attribute was set with the loop modifier, don't overwrite it.
  // This allows parent components to set more specific live preview data from loops.
  if (!binding.modifiers.loop && el.hasAttribute('data-cslp-loop')) {
    return
  }

  const livePreviewData = binding.value.$
  const livePreviewFieldName = binding.arg
  let livePreviewAttribute: string | undefined

  if (livePreviewFieldName) {
    const fieldData = livePreviewData?.[livePreviewFieldName]
    livePreviewAttribute = fieldData?.['data-cslp']
  } else {
    livePreviewAttribute = livePreviewData?.['data-cslp']
  }

  if (livePreviewAttribute) {
    el.setAttribute('data-cslp', livePreviewAttribute)
  } else {
    el.removeAttribute('data-cslp')
  }

  if (binding.modifiers.loop) {
    el.setAttribute('data-cslp-loop', 'true')
  } else {
    el.removeAttribute('data-cslp-loop')
  }
}

/**
 * Vue directive that sets `data-cslp` attributes for Contentstack Visual Builder.
 * Reads metadata from `element.$` injected by `contentstack.Utils.addEditableTags()`.
 *
 * Why this is Contentstack-specific and not a shared CMS concern: Contentstack's
 * Live Preview / Visual Builder identifies editable regions by matching `data-cslp`
 * edit tags rendered onto the DOM, so it needs a directive that stamps those
 * attributes onto elements. Other providers do not use this DOM-tag mechanism —
 * Contentful drives live preview through the `useContentfulEditor()` runtime hook
 * (dynamic import in `useContentfulEditor.ts`), and the Scayle default provider has
 * no visual editor at all. There is no shared abstraction to extract yet because no
 * two providers share this attribute-tagging contract; if another provider later
 * adopts the same `data-cslp`-style tagging, promote this into a shared directive.
 *
 * @example Basic usage
 * ```html
 * <div v-live-preview:content="contentElement" />
 * ```
 *
 * @example Field-specific targeting
 * ```html
 * <h1 v-live-preview:title="contentElement">{{ contentElement.title }}</h1>
 * ```
 *
 * @example Loop modifier for collections
 * ```html
 * <div v-live-preview:content="data">
 *   <div v-for="(item, index) in data.content" :key="item.uid">
 *     <ContentstackBlockDispatch
 *       v-live-preview:[`content__${index}`].loop="data"
 *       :content-element="item"
 *     />
 *   </div>
 * </div>
 * ```
 *
 * @see https://www.contentstack.com/docs/developers/set-up-live-preview/set-up-live-edit-tags-for-entries-with-rest
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/contentstack
 */
export const vLivePreview = {
  beforeMount<T extends SystemFields & { $?: LivePreviewData }>(
    el: HTMLElement,
    binding: DirectiveBinding<T, 'loop', string | undefined>,
  ) {
    if (!binding.value) {
      return
    }

    updateLivePreviewData(el, binding)
  },
  updated<T extends SystemFields & { $?: LivePreviewData }>(
    el: HTMLElement,
    binding: DirectiveBinding<T, string, string | undefined>,
  ) {
    updateLivePreviewData(el, binding)
  },
}
