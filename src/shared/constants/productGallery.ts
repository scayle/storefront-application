/**
 * 0-based gallery index where the first product video is inserted.
 * Remaining videos follow consecutively from this index, and images after
 * it shift down. `1` places videos in the second slide.
 */
export const VIDEO_GALLERY_INDEX = 1

/**
 * Maximum number of product videos the product mapper includes on the
 * detailed product. Videos beyond this cap never reach the gallery or JSON-LD.
 */
export const MAX_GALLERY_VIDEOS = 5
