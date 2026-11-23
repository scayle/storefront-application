import type { ImageVariantAttributes } from '@scayle/storefront/types'

/**
 * Candidate widths shared by every PDP gallery tile preset. The ladder tops out
 * at twice the widest tile (716px) and three times a 430px phone slide.
 */
const GALLERY_WIDTHS = [256, 320, 384, 512, 640, 768, 1024, 1280, 1536] as const

/**
 * Responsive image presets shared by the server mappers and the client image
 * components. Kept here (in `src/shared`) so a component can name the preset
 * that matches its own CSS grid, and both sides build identical `srcset`/`sizes`
 * strings from the single image URL the server ships.
 *
 * Media conditions in `sizes` use the rem `--breakpoint-*` values from
 * design-tokens.css, so they switch together with the Tailwind variants when
 * the browser font size changes.
 *
 * The `sizes` value must mirror the layout the component renders at; when a
 * preset's grid changes, update it here rather than in a server-only constant.
 *
 * The `gallery*` tile presets mirror the PDP layout: the `container` utility
 * (16px gutters, 28px and a 1280px cap from `lg` up), the `3fr`/`2fr` split
 * with a 32px gap in `ProductDetail.vue`, and the 8px gap between tiles in
 * `SFProductImageGrid`, which picks one per tile from its grid row (see
 * `buildGalleryTilePresets`). Below `sm` the grid gives way to the
 * full-bleed mobile slider, which renders each image with the same preset, so
 * every tile preset ends in `100vw`. Both layouts stay in the DOM and each
 * loads its first image eagerly; sharing the preset makes the hidden layout's
 * first image resolve to the URL the visible one already fetched.
 */
export const IMAGE_VARIANTS = {
  /** Small image for thumbnail strips and selectors. */
  thumbnail: {
    widths: [96, 192],
    sizes: '96px',
    fallbackWidth: 96,
  },
  /** Fixed 48px color swatch (current product and siblings render the same size). */
  swatch: {
    widths: [48, 96],
    sizes: '48px',
    fallbackWidth: 48,
  },
  /** Product tile image for listing grids. */
  tile: {
    widths: [160, 192, 256, 320, 384, 512, 640],
    sizes: '(min-width: 48rem) 25vw, 50vw',
    fallbackWidth: 320,
  },
  /** Large product image outside the PDP gallery, such as the promotion selection modal. */
  detail: {
    widths: [320, 384, 512, 640, 768, 1024, 1280],
    sizes: '(min-width: 48rem) 50vw, 100vw',
    fallbackWidth: 640,
  },
  /** PDP gallery tile alone in its row, spanning the full gallery column. */
  galleryFull: {
    widths: GALLERY_WIDTHS,
    sizes:
      '(min-width: 80rem) 716px, (min-width: 64rem) calc(60vw - 52px), (min-width: 40rem) calc(100vw - 32px), 100vw',
    fallbackWidth: 768,
  },
  /** PDP gallery tile sharing its row with one other tile. */
  galleryHalf: {
    widths: GALLERY_WIDTHS,
    sizes:
      '(min-width: 80rem) 354px, (min-width: 64rem) calc(30vw - 30px), (min-width: 40rem) calc(50vw - 20px), 100vw',
    fallbackWidth: 512,
  },
  /** PDP gallery tile sharing its row with two other tiles. */
  galleryThird: {
    widths: GALLERY_WIDTHS,
    sizes:
      '(min-width: 80rem) 234px, (min-width: 64rem) calc(20vw - 22px), (min-width: 40rem) calc(33.34vw - 16px), 100vw',
    fallbackWidth: 384,
  },
  /**
   * Full-screen PDP zoom slide. Sized for the maximum zoom scale rather than
   * the resting layout, so the image stays sharp once the user zooms in: 1.5×
   * the `75vh`-wide frame from `lg` up, 2× the full-width slide below.
   */
  galleryZoom: {
    widths: [640, 768, 1024, 1280, 1536, 2048],
    sizes: '(min-width: 64rem) 113vh, 200vw',
    fallbackWidth: 1280,
  },
} as const satisfies Record<string, ImageVariantAttributes>

/** Name of a responsive image preset. */
export type ImageVariantName = keyof typeof IMAGE_VARIANTS
