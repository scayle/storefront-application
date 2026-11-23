import type { CMSImageOptions, CMSImageSource } from '@client/cms/shared/image'
import { getSources } from '@client/cms/shared/image'

/**
 * Builds Storyblok image transformation URLs for responsive source generation.
 *
 * @param sourceUrl Original Storyblok image URL
 * @param options Optimization options used for this source candidate
 * @returns Storyblok image service URL with format conversion
 *
 * @see https://www.storyblok.com/docs/api/image-service
 */
export const optimizeStoryblokImage = (
  sourceUrl: string,
  options: CMSImageOptions,
): string => {
  return `${sourceUrl}/m/${options.width}x0/filters:format(${options.format}):quality(80)`
}

/**
 * Creates Storyblok responsive sources for a single image URL.
 *
 * @param imageUrl Storyblok image URL
 * @param viewportFraction Fraction of viewport width used by the image
 * @returns Responsive source entries for AVIF, WebP, and JPEG
 */
export const createStoryblokSources = (
  imageUrl: string,
  viewportFraction: number,
): CMSImageSource[] => {
  return getSources(imageUrl, viewportFraction, optimizeStoryblokImage)
}
