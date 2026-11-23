import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { router } from '@inertiajs/vue3'
import { useI18n } from 'vue-i18n'
import type { ImageViewOption } from '@shared/types/ImageView'
import { IMAGE_VIEW_QUERY_KEY } from '@shared/constants/imageView'
import { useRoute } from './useRoute'

/** One entry of the image view selector. */
export interface ImageViewItem {
  /** Stable `imageType` value, or `undefined` for the default view. */
  value: string | undefined
  /**
   * The storefront translation for the default view, the Storefront API label
   * for every other view.
   */
  label: string
}

/** Return shape of `useImageView`. */
export interface UseImageViewReturn {
  /** The default view followed by the options in Storefront API order. */
  items: ComputedRef<ImageViewItem[]>
  /**
   * The selected entry of `items`. The default view when the URL names no view
   * or one the shop does not offer.
   */
  selectedItem: ComputedRef<ImageViewItem>
  /** Stable value of the selected view, `undefined` for the default view. */
  selectedImageType: ComputedRef<string | undefined>
  /**
   * Writes the view to the URL without a server request.
   *
   * @param value Stable value of the view, or `undefined` for the default view,
   *   which removes the parameter.
   */
  selectImageType: (value: string | undefined) => void
}

/**
 * Reads and writes the image view selected on the PLP or the Search Results
 * Page.
 *
 * The URL is the only state: the selection is derived from Inertia's page URL,
 * which is the same during server-side rendering and in the browser, so a
 * shared link renders its view in the first paint. Every caller on a page reads
 * the same selection, which lets the page pass it to the product grid while
 * the selector components write it.
 *
 * @param options Image views the shop offers, from the `imageViewOptions` page
 *   prop.
 * @returns The selector items, the selection, and a function to change it.
 *
 * @example
 * ```ts
 * const props = defineProps<{ imageViewOptions: ImageViewOption[] }>()
 * const { selectedImageType } = useImageView(() => props.imageViewOptions)
 * // <SFProductGrid :image-type="selectedImageType" ... />
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-listing-page
 */
export function useImageView(
  options: MaybeRefOrGetter<ImageViewOption[]>,
): UseImageViewReturn {
  const { t } = useI18n()
  const { path, query } = useRoute()

  const defaultItem = computed<ImageViewItem>(() => ({
    value: undefined,
    label: t('image_view_selection.default'),
  }))

  const items = computed<ImageViewItem[]>(() => [
    defaultItem.value,
    ...toValue(options),
  ])

  const selectedOption = computed(() =>
    toValue(options).find(
      (option) => option.value === query.value.get(IMAGE_VIEW_QUERY_KEY),
    ),
  )

  const selectedImageType = computed(() => selectedOption.value?.value)

  const selectedItem = computed<ImageViewItem>(
    () => selectedOption.value ?? defaultItem.value,
  )

  const selectImageType = (value: string | undefined) => {
    // Compared with the raw parameter, not the resolved selection: a value the
    // shop no longer offers resolves to the default view, and choosing the
    // default view has to remove it from the URL.
    if (value === (query.value.get(IMAGE_VIEW_QUERY_KEY) ?? undefined)) {
      return
    }

    const nextQuery = new URLSearchParams(query.value)
    if (value === undefined) {
      nextQuery.delete(IMAGE_VIEW_QUERY_KEY)
    } else {
      nextQuery.set(IMAGE_VIEW_QUERY_KEY, value)
    }
    const queryString = nextQuery.toString()

    // The page already holds every image of every tile, so a switch is a
    // reorder plus a URL update: a client-side visit, no request. Replacing
    // the history entry keeps the view on back navigation from the PDP
    // without adding a step per switch.
    router.replace({
      url: queryString ? `${path.value}?${queryString}` : path.value,
      preserveScroll: true,
      preserveState: true,
    })
  }

  return { items, selectedItem, selectedImageType, selectImageType }
}
