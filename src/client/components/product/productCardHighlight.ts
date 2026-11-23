import type { CSSProperties } from 'vue'

/**
 * Direct highlight values for driving `SFProductCard`'s highlighted-deal
 * treatment without a page promotion, e.g. the CMS Single Product spotlight.
 * When set, these take precedence over any highlight derived from page
 * promotions.
 */
export interface ProductCardHighlightOverride {
  /**
   * Border/footer background color and footer/badge text color. Matches the
   * shape used across the deal domain (`Promotion.color`, `SFDealBadge.style`).
   */
  color?: Pick<CSSProperties, 'backgroundColor' | 'color'>
  /** Custom deal-badge label. When omitted, no default "Deal" badge is shown. */
  badgeLabel?: string
  /** Countdown target. Enables the highlight footer when set. */
  countdownEndDate?: string
}

const HEX_COLOR = /^#(?:[0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/i
const RGB_COLOR =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/

// The `\d{1,3}` channels in RGB_COLOR match any 0-999 number, so an rgb() value
// with an out-of-range channel (e.g. `rgb(300, 999, 50)`) would otherwise pass
// validation and skew the luminance-based contrast pick. Channels are always
// non-negative, so only the upper bound needs enforcing.
function hasValidRgbChannels(match: RegExpExecArray): boolean {
  return match
    .slice(1, 4)
    .every((channel) => Number.parseInt(channel, 10) <= 255)
}

/**
 * Checks whether a CMS-supplied color string is a supported HEX or rgb/rgba value.
 *
 * @param value Raw color string from CMS editorial config.
 * @returns `true` when the value matches a supported CSS color format.
 */
export function isCssColor(value: string): boolean {
  const trimmed = value.trim()
  if (HEX_COLOR.test(trimmed)) {
    return true
  }

  const rgbMatch = RGB_COLOR.exec(trimmed)
  return !!rgbMatch && hasValidRgbChannels(rgbMatch)
}

/**
 * Validates and returns a CMS color string, or `undefined` when the value is
 * missing or unsupported.
 *
 * @param value Raw color string from CMS editorial config.
 * @returns Sanitized color string, or `undefined` when invalid.
 */
export function sanitizeCssColor(value?: string): string | undefined {
  if (!value?.trim()) {
    return undefined
  }

  const trimmed = value.trim()
  return isCssColor(trimmed) ? trimmed : undefined
}

/**
 * Sanitizes CMS highlight colors and derives a readable text color when only a
 * background is configured.
 *
 * When no explicit text color is set, the browser's native `contrast-color()`
 * picks a readable color against the sanitized background, so no manual
 * luminance math is needed.
 *
 * @param backgroundColor Optional CMS background color.
 * @param textColor Optional CMS text color.
 * @returns Sanitized color pair, or `undefined` when both inputs are invalid.
 */
export function resolveHighlightColors(
  backgroundColor?: string,
  textColor?: string,
): Pick<CSSProperties, 'backgroundColor' | 'color'> | undefined {
  const sanitizedBackground = sanitizeCssColor(backgroundColor)
  const sanitizedText = sanitizeCssColor(textColor)

  if (!sanitizedBackground && !sanitizedText) {
    return undefined
  }

  return {
    backgroundColor: sanitizedBackground,
    color:
      sanitizedText ??
      (sanitizedBackground
        ? `contrast-color(${sanitizedBackground})`
        : undefined),
  }
}
