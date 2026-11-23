/**
 * Normalizes a Storyblok content array to a safe array for rendering.
 * Returns the array value as-is if present, or an empty array if undefined or missing.
 * The return type is inferred from the field type.
 *
 * @param content Content array field from a Storyblok content element
 * @returns The content array, or an empty array if undefined
 *
 * @example
 * ```ts
 * // Returns AccordionItemComponent[] (inferred from AccordionComponent['content'])
 * const items = extractBlocks(props.contentElement.content)
 *
 * // Returns the column content union[] (inferred from GridComponent['columnContent'])
 * const columns = extractBlocks(props.contentElement.columnContent)
 * ```
 */
export const extractBlocks = <T>(content: T[] | undefined): T[] => {
  return Array.isArray(content) ? content : []
}
