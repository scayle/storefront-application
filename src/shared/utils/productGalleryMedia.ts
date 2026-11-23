import type { ProductImage, ProductVideo } from '@scayle/storefront/types'
import { VIDEO_GALLERY_INDEX } from '@shared/constants/productGallery'
import type { ImageVariantName } from '@shared/constants/imageVariants'

/** Image slide in the PDP gallery media sequence. */
export interface ProductGalleryImage {
  type: 'image'
  url: string
  applyPadding?: boolean
}

/** Video slide in the PDP gallery media sequence. */
export interface ProductGalleryVideo {
  type: 'video'
  url: string
  posterUrl?: string
}

/** Ordered gallery item consumed by the PDP slider, grid, and zoom. */
export type ProductGalleryItem = ProductGalleryImage | ProductGalleryVideo

/** Number of tiles in one PDP gallery grid row. */
export type ProductGalleryRowSize = 1 | 2 | 3

/**
 * Preset per grid row size: a tile alone in its row spans the full gallery
 * column, two tiles split it in half, three in thirds.
 */
const ROW_SIZE_PRESET: Record<ProductGalleryRowSize, ImageVariantName> = {
  1: 'galleryFull',
  2: 'galleryHalf',
  3: 'galleryThird',
}

/**
 * Partitions `count` PDP gallery tiles (images and videos) into grid rows: the
 * top row holds 1-2 tiles, every later row 2-3, non-decreasing (larger tiles on
 * top), an exact partition of `count`, fewest rows. For example 7 gives
 * `[2, 2, 3]` and 3 gives `[1, 2]`. The top row is capped at 2, which forces an
 * extra row at counts like 6 (`[2, 2, 2]` rather than the illegal `[3, 3]`).
 * Videos count as tiles so they keep this rhythm instead of getting a separate
 * layout.
 *
 * {@link buildGalleryTileRowSizes} expands this to one row size per tile;
 * `SFProductImageGrid` maps those sizes to column spans and image presets so
 * both agree on how wide a tile renders.
 *
 * @param count Number of gallery tiles.
 * @returns Tile count per row, top to bottom. Empty when `count` is 0.
 */
export function partitionGalleryRows(count: number): ProductGalleryRowSize[] {
  if (count <= 0) {
    return []
  }
  if (count === 1) {
    return [1]
  }
  // The general formula below would yield [3] here, which breaks the 1-2
  // tile cap on the top row.
  if (count === 3) {
    return [1, 2]
  }
  const rows = Math.ceil((count + 1) / 3)
  const threes = count - 2 * rows
  const twos = rows - threes
  return [
    ...Array.from<ProductGalleryRowSize>({ length: twos }).fill(2),
    ...Array.from<ProductGalleryRowSize>({ length: threes }).fill(3),
  ]
}

/**
 * Lists the grid row size for each PDP gallery tile, in gallery order. Each
 * entry is how many tiles share that tile's row (1, 2, or 3), which drives
 * both column span and image preset lookup.
 *
 * @param count Number of gallery tiles (images and videos).
 * @returns One row size per tile. Empty when `count` is 0.
 */
export function buildGalleryTileRowSizes(
  count: number,
): ProductGalleryRowSize[] {
  return partitionGalleryRows(count).flatMap((rowSize) =>
    Array.from<ProductGalleryRowSize>({ length: rowSize }).fill(rowSize),
  )
}

/**
 * Resolves the responsive image preset for a tile that sits in a row of the
 * given size on the PDP gallery grid.
 *
 * @param rowSize How many tiles share the row (1, 2, or 3).
 * @returns Preset name sized for that tile width.
 */
export function galleryImagePresetForRowSize(
  rowSize: ProductGalleryRowSize,
): ImageVariantName {
  return ROW_SIZE_PRESET[rowSize]
}

/**
 * Lists the responsive preset per PDP gallery tile, in gallery order: the
 * preset for the width of the grid row the tile lands in. The grid and the
 * mobile slider both index into it, since every gallery tile preset is
 * full-bleed below 640px.
 *
 * @param count Number of gallery tiles (images and videos).
 * @returns One preset name per tile. Video tiles get one too, which their
 *   slides ignore.
 */
export function buildGalleryTilePresets(count: number): ImageVariantName[] {
  return buildGalleryTileRowSizes(count).map(galleryImagePresetForRowSize)
}

/**
 * Preset of every slide in the PDP zoom view. The gallery preloads its zoom
 * images with the same preset, so both request the same URL.
 */
export const GALLERY_ZOOM_PRESET = 'galleryZoom' satisfies ImageVariantName

/**
 * Builds the ordered PDP gallery sequence: videos inserted at
 * {@link VIDEO_GALLERY_INDEX}, remaining images shifted after them.
 *
 * @param images Mapped product images, in Storefront API order.
 * @param videos Mapped product videos, in the order the mapper produced them.
 *   This function does not cap the length; callers pass an already-limited
 *   list.
 * @returns One ordered list of image and video items.
 */
export function buildProductGalleryMedia(
  images: ProductImage[],
  videos: ProductVideo[],
): ProductGalleryItem[] {
  const imageItems: ProductGalleryImage[] = images.map((image) => ({
    type: 'image',
    url: image.url,
    ...(image.applyPadding ? { applyPadding: true } : {}),
  }))
  const videoItems: ProductGalleryVideo[] = videos.map((video) => ({
    type: 'video',
    url: video.url,
    ...(video.posterUrl ? { posterUrl: video.posterUrl } : {}),
  }))

  if (videoItems.length === 0) {
    return imageItems
  }

  const insertIndex = Math.min(VIDEO_GALLERY_INDEX, imageItems.length)
  return [
    ...imageItems.slice(0, insertIndex),
    ...videoItems,
    ...imageItems.slice(insertIndex),
  ]
}
