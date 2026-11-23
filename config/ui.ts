/**
 * Default aspect ratio for product images [width, height].
 * Used to maintain consistent image dimensions across the Storefront Application.
 *
 * @example [3, 4] represents a 3:4 aspect ratio (portrait orientation)
 */
export const PRODUCT_IMAGE_ASPECT_RATIO = [3, 4]

/**
 * Responsive breakpoint values in pixels.
 * Used by Playwright helpers for mobile vs desktop viewport checks, so it only
 * carries the widths those helpers switch on. Every key here must match the
 * matching `--breakpoint-*` in `src/client/design-tokens.css` (`@theme static`),
 * which declares the full set in rem. The values here are those rem values at
 * the default 16px browser font size used by Playwright.
 */
export const BREAKPOINTS = {
  /** Small devices (640px and up) */
  sm: 640,
  /** Large devices (1024px and up) */
  lg: 1024,
}
