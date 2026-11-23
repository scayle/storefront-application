/**
 * Gets the number of decimal places a currency uses in its standard representation
 * using the Internationalization API.
 *
 * @param currencyCode - The ISO-4217 currency code (e.g., `'USD'`, `'EUR'`, `'JPY'`)
 * @returns The number of decimal places (e.g., `2` for USD, `0` for JPY)
 *
 * @example
 * ```ts
 * getDecimalPlacesForCurrency('USD') // 2
 * getDecimalPlacesForCurrency('JPY') // 0
 * getDecimalPlacesForCurrency('BHD') // 3
 * ```
 */
export function getDecimalPlacesForCurrency(currencyCode: string): number {
  const parts = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).formatToParts(0)

  const fraction = parts.find((p) => p.type === 'fraction')

  if (!fraction) {
    return 0
  }

  return fraction.value.length
}
