/**
 * Image optimization options passed to provider URL transformers.
 */
export interface CMSImageOptions {
  /** Target width in pixels for the generated source candidate. */
  width: number
  /** Output format requested for this source candidate. */
  format: 'avif' | 'webp' | 'jpg' | 'png'
}

/**
 * Responsive source entry consumed by `<source>` tags in CMS image components.
 */
export interface CMSImageSource {
  /** MIME type used by the browser for source selection. */
  type: string
  /** Comma-separated srcset candidates with width descriptors. */
  srcset: string
  /** Sizes attribute aligned with the generated srcset widths. */
  sizes: string
}

const BREAKPOINTS = [
  { minWidth: 1280, viewportWidth: 1280 },
  { minWidth: 1024, viewportWidth: 1024 },
  { minWidth: 640, viewportWidth: 640 },
  { minWidth: 0, viewportWidth: 375 },
]

/**
 * Total horizontal padding on the page `container` utility below `lg`.
 * Keep in sync with `padding-inline: calc(var(--spacing) * 4)` in index.css.
 * Tailwind v4 `--spacing` is 0.25rem (4px at default root font size), so each
 * side is 16px; `padding-inline` applies left and right, hence 32px total.
 */
const CONTAINER_PADDING_INLINE_MOBILE_PX = 32

/**
 * Total horizontal padding on the page `container` utility at `lg` and above.
 * Keep in sync with `padding-inline: calc(var(--spacing) * 7)` in index.css.
 * Each side is 28px; `padding-inline` applies left and right, hence 56px total.
 */
const CONTAINER_PADDING_INLINE_DESKTOP_PX = 56

/**
 * Returns container content width at a breakpoint by subtracting page padding.
 * Desktop breakpoints (≥1024px) use the `lg` padding; smaller viewports use mobile padding.
 *
 * @param viewportWidth Reference viewport width for this breakpoint
 * @param minWidth Media-query threshold for this breakpoint
 * @returns Content width inside the page container at this breakpoint
 */
const getContainerContentWidth = (
  viewportWidth: number,
  minWidth: number,
): number => {
  const padding =
    minWidth >= 1024
      ? CONTAINER_PADDING_INLINE_DESKTOP_PX
      : CONTAINER_PADDING_INLINE_MOBILE_PX

  return viewportWidth - padding
}

/**
 * Builds a `sizes` attribute from the shared breakpoint ladder, subtracting container
 * padding at each step and scaling by viewport fraction.
 *
 * @param viewportFraction Fraction of container content width used by the image slot
 * @returns Sizes attribute for picture/source tags
 */
const buildSizes = (viewportFraction: number): string => {
  return BREAKPOINTS.map(({ minWidth, viewportWidth }) => {
    const width = Math.round(
      Math.max(
        1,
        getContainerContentWidth(viewportWidth, minWidth) * viewportFraction,
      ),
    )

    if (minWidth === 0) {
      return `${width}px`
    }

    return `(min-width: ${minWidth}px) ${width}px`
  }).join(', ')
}

/**
 * Generates responsive image sources and sizes from a viewport fraction.
 * Used by Contentful, Storyblok, and Contentstack image and video components.
 *
 * @param url Source image URL
 * @param viewportFraction Fraction of viewport width used by the image
 * @param optimizeUrl Provider specific image URL optimizer
 * @returns Source set entries for picture/source tags
 *
 * @example
 * ```ts
 * const sources = getSources(imageUrl, 0.5, optimizeStoryblokImage)
 * ```
 *
 * @see https://developer.mozilla.org/docs/Web/API/HTMLImageElement/srcset
 */
export const getSources = (
  url: string,
  viewportFraction: number,
  optimizeUrl: (url: string, options: CMSImageOptions) => string,
): CMSImageSource[] => {
  const widths = BREAKPOINTS.map(({ viewportWidth }) =>
    Math.round(Math.max(1, viewportWidth * viewportFraction)),
  )
  const sizes = buildSizes(viewportFraction)

  const buildSrcset = (format: CMSImageOptions['format']) => {
    return widths
      .map((width) => `${optimizeUrl(url, { width, format })} ${width}w`)
      .join(', ')
  }

  return [
    {
      type: 'image/avif',
      srcset: buildSrcset('avif'),
      sizes,
    },
    {
      type: 'image/webp',
      srcset: buildSrcset('webp'),
      sizes,
    },
    {
      type: 'image/jpeg',
      srcset: buildSrcset('jpg'),
      sizes,
    },
  ]
}
