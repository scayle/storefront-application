// Client-side display formatting for subscriptions. The subscription rules
// (eligibility, intervals, item groups, definition comparison) live in
// `@scayle/storefront`.

/**
 * Maps an `Intl.PluralRules` ordinal category to its `subscription.ordinal_suffix.*`
 * i18n key. vue-i18n's default plural rule cannot select a fourth choice from a
 * single "th | st | nd | rd" message, so each category has its own key. `zero`
 * and `many` share the `other` key because no supported locale distinguishes
 * them for ordinals.
 */
const ORDINAL_SUFFIX_KEY: Record<Intl.LDMLPluralRule, string> = {
  zero: 'subscription.ordinal_suffix.other',
  one: 'subscription.ordinal_suffix.one',
  two: 'subscription.ordinal_suffix.two',
  few: 'subscription.ordinal_suffix.few',
  many: 'subscription.ordinal_suffix.other',
  other: 'subscription.ordinal_suffix.other',
}

/**
 * Formats a preferred delivery day as a localized ordinal (e.g. "1st", "15th").
 *
 * The day is only formatted when it is a valid integer between 1 and 31 (inclusive);
 * otherwise, the function returns undefined. The suffix key is chosen from the
 * ordinal plural category that Intl.PluralRules returns for the day. The translator
 * function `t` takes that key and returns the localized suffix.
 *
 * @param day The delivery day (1–31), or undefined.
 * @param locale The BCP 47 locale string (e.g. "en-GB").
 * @param t A translation function: `t('subscription.ordinal_suffix.one')`.
 * @returns The day formatted with its localized ordinal suffix, or undefined if day is invalid.
 */
export function formatDeliveryDay(
  day: number | undefined,
  locale: string,
  t: (key: string) => string,
): string | undefined {
  if (
    day === undefined ||
    Number.isNaN(day) ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    return undefined
  }
  const category = new Intl.PluralRules(locale, { type: 'ordinal' }).select(day)
  return `${day}${t(ORDINAL_SUFFIX_KEY[category])}`
}
