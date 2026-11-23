import { formatCurrency, formatPercentage } from '@scayle/storefront/shared'

/**
 * Currency and percentage formatting are owned by `@scayle/storefront`. Imported
 * from the isomorphic `/shared` entry (not the root, which pulls the Hono server
 * runtime) so this client-reachable module does not drag server-only code into
 * the browser bundle. Re-exported so existing `@shared/utils/formatter` imports
 * keep working.
 */
export { formatCurrency, formatPercentage }

/**
 * Format a Date object in a numeric format according to the current shop's locale
 * e.g. 25.12.2024 (DE), 25/12/2024 (UK), 12/25/2024 (US)
 * @param date The Date object to be formatted
 * @returns The formatted date string
 */
export const formatDate = (
  date: Date,
  locale: string = 'en-GB',
): string | undefined => {
  if (!date || Number.isNaN(date.valueOf())) {
    return undefined
  }

  const formatterDate = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })

  return formatterDate.format(date)
}
/**
 * Format a Date object in a date and time format according to the current shop's locale
 * e.g. 25.12.2024 12:00 (DE), 12/25/2024 12:00 (UK), 12/25/2024 12:00 (US)
 * @param date The Date object to be formatted
 * @returns The formatted date and time string
 */
export const formatDateTime = (
  date: Date,
  locale: string = 'en-GB',
): string | undefined => {
  if (!date || Number.isNaN(date.valueOf())) {
    return
  }

  const formatterDateTime = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })

  return formatterDateTime.format(date)
}
