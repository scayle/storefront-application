/**
 * Rounds a number down to the nearest interval using `Math.floor`.
 *
 * @param value - The number to round down
 * @param interval - The interval to round to (must be non-zero)
 * @returns The rounded number, or `NaN` if interval is invalid
 *
 * @example
 * ```ts
 * roundDown(17, 5)   // 15
 * roundDown(42, 10)  // 40
 * roundDown(7.8, 2)  // 6
 * roundDown(10, 0)   // NaN
 * ```
 */
export function roundDown(value: number, interval: number): number {
  if (Number.isNaN(interval) || interval <= 0) {
    return NaN
  }
  const div = value / interval
  return Math.floor(div) * interval
}

/**
 * Rounds a number up to the nearest interval using `Math.ceil`.
 *
 * @param value - The number to round up
 * @param interval - The interval to round to (must be non-zero)
 * @returns The rounded number, or `NaN` if interval is invalid
 *
 * @example
 * ```ts
 * roundUp(17, 5)   // 20
 * roundUp(42, 10)  // 50
 * roundUp(7.8, 2)  // 8
 * roundUp(10, 0)   // NaN
 * ```
 */
export function roundUp(value: number, interval: number): number {
  if (Number.isNaN(interval) || interval <= 0) {
    return NaN
  }
  const div = value / interval
  return Math.ceil(div) * interval
}

/**
 * Clamps a number to a given range.
 *
 * @param value - The number to clamp
 * @param min - Lower bound (inclusive)
 * @param max - Upper bound (inclusive)
 * @returns Value clamped to [min, max]
 *
 * @example
 * ```ts
 * clamp(5, 0, 10)   // 5
 * clamp(-3, 0, 10)  // 0
 * clamp(15, 0, 10)  // 10
 * clamp(2, -5, 5)   // 2
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Wraps an index into `[0, length)`, cycling past either end — the last item
 * wraps to the first and vice versa. Handles any offset (not just ±1), so
 * `wrapIndex(-1, 3)` is `2` and `wrapIndex(3, 3)` is `0`. Used by roving-focus
 * rails (image dots, gallery thumbnails) for Arrow/Home/End navigation.
 *
 * @param index - The (possibly out-of-range) index to wrap
 * @param length - Number of items; returns `0` when `length` is `0`
 * @returns The equivalent index within `[0, length)`
 *
 * @example
 * ```ts
 * wrapIndex(0, 3)   // 0
 * wrapIndex(3, 3)   // 0  (past the end → first)
 * wrapIndex(-1, 3)  // 2  (before the start → last)
 * ```
 */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0
  }
  return ((index % length) + length) % length
}

/**
 * Maps a number from one numeric range to another and clamps the result to the output range.
 *
 * @param num - The number to map
 * @param inMin - The minimum value of the input range
 * @param inMax - The maximum value of the input range
 * @param outMin - The minimum value of the output range
 * @param outMax - The maximum value of the output range
 *
 * @returns The mapped number, clamped to the output range
 *
 */
export function mapNumberToRange(
  num: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const mappedNumber =
    ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin

  return clamp(mappedNumber, outMin, outMax)
}
