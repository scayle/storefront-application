import type { ValueOf } from 'type-fest'
import type { ImageVariantName } from '@shared/constants/imageVariants'

/**
 * Standard size variants for UI components.
 * Used across buttons, inputs, and other elements for consistent sizing.
 */
export const Size = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const

export type Size = ValueOf<typeof Size>

/**
 * Semantic HTML tags available for headline components.
 * Supports heading hierarchy (h1-h6) and alternative display elements.
 */
export const HeadlineTag = {
  H1: 'h1',
  H2: 'h2',
  H3: 'h3',
  H4: 'h4',
  H5: 'h5',
  H6: 'h6',
  P: 'p',
  DIV: 'div',
  SPAN: 'span',
} as const

export type HeadlineTag = ValueOf<typeof HeadlineTag>

/**
 * Heading levels from the SCAYLE Storefront Type Hierarchy (Figma source of truth).
 * Each level maps to a semantic native tag with a matching `heading-*` utility class.
 */
export const HeadingLevel = {
  /** Page-level heading. Visual: `text-3xl semibold`, default tag `<h1>`. */
  PAGE: 'page',
  /** Top section heading. Visual: `text-2xl semibold`, default tag `<h2>`. */
  SECTION_1: 'section-1',
  /** Sub-section heading. Visual: `text-lg semibold`, default tag `<h3>`. */
  SECTION_2: 'section-2',
  /** Smallest section heading. Visual: `text-md semibold`, default tag `<h4>`. */
  SECTION_3: 'section-3',
} as const

export type HeadingLevel = ValueOf<typeof HeadingLevel>

/**
 * Size variants for body text and value-style typography components.
 * Distinguishes between the default reading size and the larger emphasis size from Figma.
 */
export const TextSize = {
  /** Default size. Body utilities map to `text-md`, `SFLabelValue` maps to `text-md`. */
  DEFAULT: 'default',
  /** Larger size. Body utilities map to `text-lg`, `SFLabelValue` maps to `text-lg`. */
  LARGE: 'large',
} as const

export type TextSize = ValueOf<typeof TextSize>

/**
 * Semantic HTML tags allowed for body-style typography components.
 * Restricted to neutral inline or block containers, so consumers
 * pick a semantic heading tag plus a `heading-*` utility class instead.
 */
export const TextTag = {
  P: 'p',
  SPAN: 'span',
  DIV: 'div',
} as const

export type TextTag = ValueOf<typeof TextTag>

/**
 * Trigger size variants for the SFDropdown component.
 * Mirrors the three trigger sizes defined in Figma (Small, Medium, Large).
 */
export const DropdownSize = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const

export type DropdownSize = ValueOf<typeof DropdownSize>

/**
 * Trigger variants for the SFDropdown component.
 * `with-label` renders a floating label that animates from placeholder to top-aligned
 * once a value is selected. `without-label` renders the trigger placeholder-only.
 */
export const DropdownVariant = {
  WITH_LABEL: 'with-label',
  WITHOUT_LABEL: 'without-label',
} as const

export type DropdownVariant = ValueOf<typeof DropdownVariant>

/**
 * Visual type for an SFDropdownOptionItem.
 * Maps to the Figma option-item type axis (Default, Leading radio, Trailing icon, Size Select).
 */
export const DropdownOptionType = {
  DEFAULT: 'default',
  LEADING_RADIO: 'leading-radio',
  TRAILING_ICON: 'trailing-icon',
} as const

export type DropdownOptionType = ValueOf<typeof DropdownOptionType>

/**
 * Option-item size variants for SFDropdownOptionItem.
 * Figma defines option items only at Small and Large.
 */
export const DropdownOptionSize = {
  SM: 'sm',
  LG: 'lg',
} as const

export type DropdownOptionSize = ValueOf<typeof DropdownOptionSize>

/**
 * A single slide image for the SFImageGallery / SFImageStrip default rendering.
 * Consumers that need richer slides (links, zoom) use the `#slide` slot instead.
 */
export interface ImageSliderImage {
  /** Absolute CDN base URL of the image (the server-shipped `url`). */
  url: string
  /**
   * Responsive preset name (e.g. `'tile'`). The slide's `SFProductImage` builds
   * `src`/`srcSet`/`sizes` from `url` and this preset on the client.
   */
  preset: ImageVariantName
  /** Accessible alternative text for the image. */
  alt: string
  /** Stable key for `v-for`. Falls back to the slide index when absent. */
  hash?: string | number
  /**
   * Whether the slide's image container should be padded. Only product callers set
   * this; CMS and other carousel callers leave it undefined.
   */
  applyPadding?: boolean
}

/**
 * Predefined skeleton loader types for common UI patterns.
 */
export const SkeletonType = {
  BUTTON: 'button',
  HEADLINE: 'headline',
  CUSTOM: 'custom',
} as const

export type SkeletonType = ValueOf<typeof SkeletonType>

/**
 * Thumbnail size presets for SFProductThumbnail (Figma: Small, Medium, Large).
 */
export const ThumbnailSize = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const

export type ThumbnailSize = ValueOf<typeof ThumbnailSize>

/**
 * Root box size class for SFProductThumbnail, keyed by its `thumbnailSize` prop.
 * Always applied; a parent `class` is merged onto the same root alongside it.
 */
export const THUMBNAIL_ROOT_SIZE = {
  [ThumbnailSize.SM]: 'size-10',
  [ThumbnailSize.MD]: 'size-12',
  [ThumbnailSize.LG]: 'size-15',
} as const satisfies Record<ThumbnailSize, string>

/**
 * Forced visual states for SFProductImageBase, which SFProductImage and
 * SFProductThumbnail pass through. Stories and tests use them to pin the
 * skeleton or error UI.
 */
export const ProductImageForcedState = {
  SKELETON: 'skeleton',
  ERROR: 'error',
} as const

export type ProductImageForcedState = ValueOf<typeof ProductImageForcedState>

/**
 * Button style variants defining visual hierarchy and purpose.
 */
export const ButtonVariant = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  PLAIN: 'plain',
  RAW: 'raw',
  ACCENT: 'accent',
} as const

export type ButtonVariant = ValueOf<typeof ButtonVariant>

/**
 * Desktop modal panel widths from the Storefront Design System (Figma).
 * Mobile modals are always full width and ignore this prop.
 */
export const ModalSize = {
  /** 480px */
  SM: 'sm',
  /** 620px */
  MD: 'md',
  /** 900px */
  LG: 'lg',
} as const

export type ModalSize = ValueOf<typeof ModalSize>

/**
 * Chip variants defining selection behavior and visual treatment.
 * Mirrors the design-system spec from Figma.
 */
export const ChipVariant = {
  SINGLE_SELECT: 'single-select',
  MULTI_SELECT: 'multi-select',
  DISMISSABLE: 'dismissable',
  CHOICE: 'choice',
} as const

export type ChipVariant = ValueOf<typeof ChipVariant>

/**
 * Color schemes for the Dismissable chip variant. Voucher chips represent
 * applied promotion codes; Promotion chips represent applied campaigns.
 */
export const ChipSubType = {
  VOUCHER: 'voucher',
  PROMOTION: 'promotion',
} as const

export type ChipSubType = ValueOf<typeof ChipSubType>

/**
 * Size variants for the low-stock indicator badge (Figma: Large / Small).
 */
export const LowStockIndicatorSize = {
  LARGE: 'large',
  SMALL: 'small',
} as const

export type LowStockIndicatorSize = ValueOf<typeof LowStockIndicatorSize>

/**
 * Number of skeleton placeholders rendered while the countdown hydrates on the client.
 * Matches the four countdown units (days, hours, minutes, seconds).
 */
export const COUNTDOWN_LOADER_UNITS = 4

/**
 * Number of boxed unit cells reserved by the large countdown SSR placeholder.
 * Matches the urgent-state layout of SFCountdownLarge (hours, minutes, seconds);
 * days are omitted because the urgent state always has `days === 0`.
 */
export const COUNTDOWN_LARGE_UNIT_COUNT = 3
