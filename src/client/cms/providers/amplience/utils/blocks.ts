import type { AmplienceBlock } from '@shared/types/cms/amplience'

/**
 * Normalizes an Amplience content array to a safe array for rendering.
 * Returns the array as-is when present, or an empty array when undefined.
 * The return type is inferred from the field type.
 *
 * @param content Content array field from an Amplience content element
 * @returns The content array, or an empty array when undefined
 *
 * @example
 * ```ts
 * // Returns AccordionItemComponent[] (inferred from AccordionComponent['content'])
 * const items = extractBlocks(contentElement.content)
 * ```
 */
export const extractBlocks = <T>(content: readonly T[] | undefined): T[] => {
  // `Array.isArray` still guards against a non-array value in a hand-edited entry,
  // and narrows `readonly T[]` to `any[]`, hence the cast back.
  return Array.isArray(content) ? [...(content as readonly T[])] : []
}

/**
 * Builds a stable `v-for` key for an Amplience content-array entry.
 *
 * Amplience has no per-entry `_uid` (Storyblok) or `uid` (Contentstack). Blocks
 * nested inside a content item share that item's `deliveryId`, and inline blocks
 * carry no id at all, so neither is unique on its own. The array index is
 * appended to keep keys distinct, and the id is kept as a prefix so reordering
 * a list of separately-delivered items still reuses the right DOM nodes.
 *
 * @param block Content-array entry
 * @param index Position within the content array
 * @returns Key unique within the rendered list
 */
export const getBlockKey = (
  block: Pick<AmplienceBlock, 'componentType' | '_meta'>,
  index: number,
): string => {
  const deliveryId = block._meta?.deliveryId ?? block._meta?.deliveryKey ?? ''
  return `${block.componentType}:${deliveryId}:${index}`
}
