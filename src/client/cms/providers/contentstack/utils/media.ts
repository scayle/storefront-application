import type { CMSImageOptions, CMSImageSource } from '@client/cms/shared/image'
import { getSources } from '@client/cms/shared/image'

/**
 * Builds Contentstack Image Delivery API URLs for responsive source generation.
 * Uses `auto=avif` so the CDN serves AVIF to supporting browsers with graceful fallback.
 *
 * @param sourceUrl Original Contentstack asset URL
 * @param options Optimization options used for this source candidate
 * @returns Contentstack Image Delivery API URL with optimization parameters
 *
 * @example
 * ```ts
 * const url = optimizeContentstackImage('https://images.contentstack.io/abc/image.jpg', {
 *   width: 640,
 *   format: 'avif',
 * })
 * // url === 'https://images.contentstack.io/abc/image.jpg?width=640&auto=avif&quality=80'
 * ```
 *
 * @see https://www.contentstack.com/docs/developers/apis/image-delivery-api
 */
export const optimizeContentstackImage = (
  sourceUrl: string,
  options: CMSImageOptions,
): string => {
  return `${sourceUrl}?width=${options.width}&auto=${options.format}&quality=80`
}

/**
 * Creates Contentstack responsive sources for a single image URL.
 *
 * @param imageUrl Contentstack asset URL
 * @param viewportFraction Fraction of viewport width used by the image
 * @returns Responsive source entries for AVIF, WebP, and JPEG
 *
 * @example
 * ```ts
 * const sources = createContentstackSources('https://images.contentstack.io/abc/hero.jpg', 1)
 * ```
 */
export const createContentstackSources = (
  imageUrl: string,
  viewportFraction: number,
): CMSImageSource[] => {
  return getSources(imageUrl, viewportFraction, optimizeContentstackImage)
}
