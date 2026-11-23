import type { CMSImageOptions, CMSImageSource } from '@client/cms/shared/image'
import { getSources } from '@client/cms/shared/image'

/** Default quality per format. AVIF achieves better quality at lower values. */
const FORMAT_QUALITY: Record<string, number> = {
  avif: 70,
  webp: 80,
  jpg: 80,
}

/**
 * Builds Contentful Images API URLs for responsive source generation.
 * Normalizes protocol-relative URLs to HTTPS before appending query parameters.
 *
 * @param sourceUrl Original Contentful asset URL
 * @param options Optimization options used for this source candidate
 * @returns Contentful Images API URL with width, format, and quality parameters
 *
 * @example
 * ```ts
 * const url = optimizeContentfulImage('//images.ctfassets.net/abc/image.jpg', {
 *   width: 640,
 *   format: 'webp',
 * })
 * // url === 'https://images.ctfassets.net/abc/image.jpg?w=640&fm=webp&q=80'
 * ```
 *
 * @see https://www.contentful.com/developers/docs/references/images-api/
 */
export const optimizeContentfulImage = (
  sourceUrl: string,
  options: CMSImageOptions,
): string => {
  const normalizedUrl = sourceUrl.startsWith('//')
    ? `https:${sourceUrl}`
    : sourceUrl

  const quality = FORMAT_QUALITY[options.format] ?? 80

  return `${normalizedUrl}?w=${options.width}&fm=${options.format}&q=${quality}`
}

/**
 * Creates Contentful responsive sources for a single image URL.
 *
 * @param imageUrl Contentful asset URL
 * @param viewportFraction Fraction of viewport width used by the image
 * @returns Responsive source entries for AVIF, WebP, and JPEG
 *
 * @example
 * ```ts
 * const sources = createContentfulSources('//images.ctfassets.net/abc/hero.jpg', 1)
 * ```
 */
export const createContentfulSources = (
  imageUrl: string,
  viewportFraction: number,
): CMSImageSource[] => {
  return getSources(imageUrl, viewportFraction, optimizeContentfulImage)
}
