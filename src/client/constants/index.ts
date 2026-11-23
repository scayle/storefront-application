/** Maximum number of recently viewed products to track. */
export const MAX_RECENTLY_VIEWED_PRODUCTS = 10

/**
 * The aspect ratio of the product image.
 */
export const PRODUCT_IMAGE_ASPECT_RATIO = [3, 4] as const satisfies [
  number,
  number,
]

/**
 * The number of product images that load eagerly.
 *
 * Derived from the listing grid in `SFProductGrid`, which renders
 * `col-span-6 md:col-span-4 xl:col-span-3` inside `grid-cols-12`: 2 columns
 * below 768px, 3 up to 1279px, 4 from 1280px. Measured against a PLP, the
 * number of cards touching the fold is twice the column count at each of those
 * widths (4 at 412x823, 6 at 768x1024, 8 at 1350x940).
 *
 * No single number covers all three, because `loading` is a static attribute
 * resolved during SSR where there is no viewport. 4 is the value that fits the
 * narrow end without over-fetching: the full mobile fold, and the full first
 * row of the widest grid. Cards just past it are still near the fold, where the
 * browser's lazy-loading threshold loads them right away anyway, so covering
 * them explicitly buys nothing and costs mobile bandwidth during the LCP window.
 */
export const PRODUCT_IMAGE_EAGER_LOADING_COUNT = 4

/** Native `<img loading>` values. */
export type ImageLoading = 'eager' | 'lazy'

/**
 * Resolves the canonical `loading` strategy for a product image from its
 * position in a grid, list, or slider.
 *
 * The rule: a product image loads eagerly only when it is among the first
 * `PRODUCT_IMAGE_EAGER_LOADING_COUNT` items (the ones most likely to be above
 * the fold on first paint). Everything further down loads lazily so it is
 * fetched as the user scrolls. This is the single strategy every position-aware
 * product image should follow (product cards and their sliders); it keeps the
 * LCP candidate eager without over-fetching off-screen images.
 *
 * The position-agnostic base leaf (`SFProductImageBase`) defaults to `'lazy'`,
 * so a bare `<img>` never eager-loads by accident. Position-aware callers
 * (product cards and their sliders) opt into `'eager'` through this helper.
 *
 * `fetchpriority` is deliberately not derived here. It is a relative hint, so
 * marking several images `high` cancels itself out; only the page's single LCP
 * candidate should carry it. The listing grid passes it explicitly to its first
 * card, the same split `resolveImagePriority` makes for CMS images.
 *
 * @param index Zero-based position of the image in its collection.
 * @returns `'eager'` for the first `PRODUCT_IMAGE_EAGER_LOADING_COUNT` images, `'lazy'` otherwise.
 */
export function getProductImageLoading(index: number): ImageLoading {
  return index < PRODUCT_IMAGE_EAGER_LOADING_COUNT ? 'eager' : 'lazy'
}

/**
 * Color name to hex code mapping for filter chips.
 * Supports single colors (hex string) or multi-colors (hex array).
 *
 * Keys are the `value` slug of a color attribute filter value, so they follow
 * whatever the shop's assortment defines. Unmapped slugs fall back to a plain
 * gray swatch in `SFFilterSlideInContent`. The suffixed keys (`weiss_1`,
 * `schwarz_1_2`, …) are duplicates the internal QA shop authored on top of the
 * plain color names; both spellings map to the same color.
 */
export const FILTER_COLORS: Record<
  string,
  {
    color: string | string[]
    showBorder?: true
    showBlackCheckMark?: true
  }
> = {
  weiss: { color: '#ffffff', showBorder: true, showBlackCheckMark: true },
  weiss_1: { color: '#ffffff', showBorder: true, showBlackCheckMark: true },
  beige: { color: '#e3dad1', showBlackCheckMark: true },
  schwarz: { color: '#000000' },
  schwarz_1_2: { color: '#000000' },
  grau: { color: '#6b7280' },
  silber: { color: '#c0c0c0', showBorder: true },
  rot: { color: '#ef4444' },
  rot_1_2: { color: '#ef4444' },
  blau: { color: '#3b82f6' },
  gruen: { color: '#22c55e' },
  gruen_1_2: { color: '#22c55e' },
  gelb: { color: '#eab308' },
  orange: { color: '#f97316' },
  braun: { color: '#bfa094' },
  pink: { color: '#ec4899' },
  lila: { color: '#a855f7' },
  mischfarben: { color: ['#0000ff', '#ffa500', '#ff0000', '#008000'] },
}
