import type { Attributes } from '@scayle/storefront-api'

/**
 * Collects the formatted value labels for every attribute group of the given type.
 * Used by the PDP mapper to build the body lines of a product detail section.
 *
 * When `prefixLabel` is `true` (the default), each line is rendered as
 * `"<group label>: <value label>"` to disambiguate the value (e.g. `"Fit: Regular"`).
 * Sections like `extras` set it to `false` so the value renders on its own.
 *
 * @param attributes The product's attribute groups, keyed by attribute key.
 * @param type The attribute group `type` to filter by (e.g. `'fit_size'`).
 * @param options Formatting options.
 * @param options.prefixLabel When `true` (the default), prefixes each line with its group label.
 * @returns Ordered list of formatted value labels (empty when no attributes match).
 */
export const getAttributeGroupByTypes = (
  attributes: Attributes | undefined,
  type: string,
  options: { prefixLabel?: boolean } = {},
): string[] => {
  if (!attributes) {
    return []
  }

  const { prefixLabel = true } = options
  const lines: string[] = []

  for (const attribute of Object.values(attributes)) {
    if (attribute?.type !== type) {
      continue
    }
    const values = Array.isArray(attribute.values)
      ? attribute.values
      : [attribute.values]
    for (const value of values) {
      lines.push(
        prefixLabel ? `${attribute.label}: ${value.label}` : value.label,
      )
    }
  }

  return lines
}
