// ---------------------------------------------------------------------------
// Shared layout utilities for SectionComponent, GridComponent, and
// RecentlyViewedProductsComponent
// ---------------------------------------------------------------------------

/**
 * Maps a CMS size token to Tailwind section padding classes.
 * Used by section components across all CMS providers.
 *
 * @param size CMS size token (`'none'`, `'small'`, `'medium'`, `'large'`)
 * @returns Responsive Tailwind padding classes
 */
export const resolvePaddingClass = (size?: string): string => {
  switch (size) {
    case 'small':
      return 'p-3 lg:p-5'
    case 'medium':
      return 'p-5 lg:p-9'
    case 'large':
      return 'p-9 lg:p-12'
    default:
      return 'p-0'
  }
}

/**
 * Parses an authored grid column count, falling back to a default when the
 * value is unusable. Storyblok number fields are free-text strings, and a
 * hand-edited Amplience or Contentful entry can still deliver `0` or a negative
 * number, so every provider passes its raw value through here.
 *
 * @param value Raw column count from the CMS entry, a number or a numeric string
 * @param fallback Column count to use when `value` is missing, non-numeric, or below 1
 * @returns A column count of at least 1. Counts above the supported range are
 * returned as is; the class resolvers below fall back to their default for them.
 */
export const parseColumnCount = (value: unknown, fallback: number): number => {
  // Only a number or a string can hold a count, anything else would stringify
  // as `[object Object]`.
  const parsedValue =
    typeof value === 'number' || typeof value === 'string'
      ? Number.parseInt(String(value), 10)
      : Number.NaN
  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback
  }
  return parsedValue
}

/**
 * Maps a desktop grid column count to a Tailwind `lg:grid-cols-*` class.
 * Used by grid components across all CMS providers.
 *
 * @param columns Column count, typically from `parseColumnCount`
 * @returns Tailwind grid column class for the `lg` breakpoint, `lg:grid-cols-2`
 * for counts outside 1 to 6
 */
export const resolveDesktopColumnsClass = (columns: number): string => {
  switch (columns) {
    case 1:
      return 'lg:grid-cols-1'
    case 3:
      return 'lg:grid-cols-3'
    case 4:
      return 'lg:grid-cols-4'
    case 5:
      return 'lg:grid-cols-5'
    case 6:
      return 'lg:grid-cols-6'
    case 2:
    default:
      return 'lg:grid-cols-2'
  }
}

/**
 * Maps a mobile grid column count to a Tailwind `grid-cols-*` class.
 * Used by grid components across all CMS providers.
 *
 * @param columns Column count, typically from `parseColumnCount`
 * @returns Tailwind grid column class, `grid-cols-1` for counts outside 1 to 3
 */
export const resolveMobileColumnsClass = (columns: number): string => {
  switch (columns) {
    case 3:
      return 'grid-cols-3'
    case 2:
      return 'grid-cols-2'
    case 1:
    default:
      return 'grid-cols-1'
  }
}

type GapKey = `${'column' | 'row'}-${'mobile' | 'desktop'}`

/**
 * Static gap class lookup. Each entry is a full Tailwind class string so
 * the JIT scanner can detect them at build time (dynamically assembled
 * class names like `gap-x-${value}` would be purged).
 */
const GAP_CLASS_MAP: Record<GapKey, Record<string, string>> = {
  'column-mobile': { small: 'gap-x-3', medium: 'gap-x-5', large: 'gap-x-9' },
  'column-desktop': {
    small: 'lg:gap-x-7',
    medium: 'lg:gap-x-9',
    large: 'lg:gap-x-12',
  },
  'row-mobile': { small: 'gap-y-3', medium: 'gap-y-5', large: 'gap-y-9' },
  'row-desktop': {
    small: 'lg:gap-y-7',
    medium: 'lg:gap-y-9',
    large: 'lg:gap-y-12',
  },
}

/** Default gap classes when no size token is provided. */
const GAP_DEFAULTS: Record<GapKey, string> = {
  'column-mobile': 'gap-x-0',
  'column-desktop': 'lg:gap-x-0',
  'row-mobile': 'gap-y-0',
  'row-desktop': 'lg:gap-y-0',
}

/**
 * Maps a CMS size token to a Tailwind gap class.
 * Handles both column (`gap-x`) and row (`gap-y`) gaps at mobile and desktop breakpoints.
 *
 * @param size CMS size token (`'none'`, `'small'`, `'medium'`, `'large'`)
 * @param axis Gap axis
 * @param breakpoint Responsive breakpoint
 * @returns Tailwind gap class string
 *
 * @example
 * ```ts
 * resolveGapClass('small', 'column', 'desktop') // 'lg:gap-x-7'
 * resolveGapClass('medium', 'row', 'mobile')    // 'gap-y-5'
 * ```
 */
export const resolveGapClass = (
  size: string | undefined,
  axis: 'column' | 'row',
  breakpoint: 'mobile' | 'desktop',
): string => {
  const key: GapKey = `${axis}-${breakpoint}`
  return (size && GAP_CLASS_MAP[key][size]) ?? GAP_DEFAULTS[key]
}

/**
 * Maps a CMS vertical alignment value to a Tailwind `items-*` class.
 * Used by grid and section components for cross-axis alignment.
 *
 * @param alignment CMS value (`'Top'`, `'Middle'`, `'Bottom'`)
 * @returns Tailwind items alignment class, defaults to `items-center`
 */
export const resolveVerticalAlignmentClass = (alignment?: string): string => {
  switch (alignment) {
    case 'Top':
      return 'items-start'
    case 'Bottom':
      return 'items-end'
    default:
      return 'items-center'
  }
}

/**
 * Maps a CMS horizontal alignment value to a Tailwind `items-*` class.
 * Used by flex-column containers (sections) where `items-*` controls
 * horizontal alignment of children.
 *
 * @param alignment CMS value (`'Left'`, `'Center'`, `'Right'`)
 * @returns Tailwind items alignment class, defaults to `items-center`
 */
export const resolveFlexAlignmentClass = (alignment?: string): string => {
  switch (alignment) {
    case 'Left':
      return 'items-start'
    case 'Right':
      return 'items-end'
    default:
      return 'items-center'
  }
}

/**
 * Maps a CMS horizontal alignment value to a Tailwind `justify-items-*` class.
 * Used by grid containers where `justify-items-*` controls horizontal
 * alignment of grid children.
 *
 * @param alignment CMS value (`'Left'`, `'Center'`, `'Right'`)
 * @returns Tailwind justify-items alignment class, defaults to `justify-items-center`
 */
export const resolveGridAlignmentClass = (alignment?: string): string => {
  switch (alignment) {
    case 'Left':
      return 'justify-items-start'
    case 'Right':
      return 'justify-items-end'
    default:
      return 'justify-items-center'
  }
}

/**
 * Checks whether a nested block needs `mt-auto` so a section with middle or
 * bottom vertical alignment pushes its content down, which is how V2 placed
 * content inside a min-height box. Only the first block carries the margin.
 *
 * @param index Position of the nested block within the section
 * @param verticalAlignment CMS value (`'Top'`, `'Middle'`, `'Bottom'`), treated as `'Middle'` when missing or `null`
 * @returns `true` when the block at `index` should get `mt-auto`
 */
export const shouldAddTopMargin = (
  index: number,
  verticalAlignment?: string | null,
): boolean =>
  index === 0 && ['Bottom', 'Middle'].includes(verticalAlignment ?? 'Middle')

/**
 * Checks whether a nested block needs `mb-auto` so a section with top or middle
 * vertical alignment pushes its content up, the mirror of `shouldAddTopMargin`.
 * Only the last block carries the margin.
 *
 * @param index Position of the nested block within the section
 * @param blockCount Number of nested blocks rendered in the section
 * @param verticalAlignment CMS value (`'Top'`, `'Middle'`, `'Bottom'`), treated as `'Middle'` when missing or `null`
 * @returns `true` when the block at `index` should get `mb-auto`
 */
export const shouldAddBottomMargin = (
  index: number,
  blockCount: number,
  verticalAlignment?: string | null,
): boolean =>
  index === blockCount - 1 &&
  ['Top', 'Middle'].includes(verticalAlignment ?? 'Middle')
