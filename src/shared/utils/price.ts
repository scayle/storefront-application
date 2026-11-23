const roundTo2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Converts an integer minor-unit amount to decimal currency units (e.g. `2999` to `29.99`).
 *
 * @param cents Amount in minor units, or `undefined` when the source has no numeric amount.
 * @returns Amount in decimal currency units rounded to two places, or `undefined` when the input is.
 */
export function toCurrencyUnits(cents: number): number
export function toCurrencyUnits(cents: number | undefined): number | undefined
export function toCurrencyUnits(cents: number | undefined): number | undefined {
  return cents === undefined ? undefined : roundTo2(cents / 100)
}
