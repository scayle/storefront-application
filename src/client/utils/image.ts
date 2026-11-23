import type { ProductImage } from '@scayle/storefront/types'

/**
 * Orders a product's images for the image view the user selected on the PLP or
 * the Search Results Page. Every image of the selected type moves to the
 * front, then the remaining images follow, each group in its Panel order, so
 * the product tile shows the first image of that type and the hover slider
 * follows the same order. A product with no image of that type keeps its Panel
 * order.
 *
 * @param images Product images in Panel order.
 * @param imageType Stable `imageType` value of the selected view, or
 *   `undefined` for the default view.
 * @returns The images in display order. `images` itself for the default view.
 */
export function orderImagesByImageType(
  images: ProductImage[],
  imageType: string | undefined,
): ProductImage[] {
  if (imageType === undefined) {
    return images
  }
  return [
    ...images.filter((image) => image.imageType === imageType),
    ...images.filter((image) => image.imageType !== imageType),
  ]
}
