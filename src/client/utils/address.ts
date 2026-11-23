import type { OrderAddress } from '@scayle/storefront/types'

/**
 * Checks whether two order addresses render identically.
 *
 * The order pages show a single merged box when the delivery and billing
 * addresses are the same, and a separate box for each when they differ. What
 * matters for that choice is what the customer sees, so this compares the
 * formatted lines rather than the underlying address records: the Customer
 * Account API returns the same physical address twice with different
 * `isBillingAddress` / `isShippingAddress` flags and different ids, so
 * comparing the records themselves reports a difference that is invisible on
 * the page.
 *
 * @param first One of the two addresses to compare.
 * @param second The address to compare it against.
 * @returns `true` when both addresses produce the same lines in the same order.
 */
export function addressLinesMatch(
  first: OrderAddress,
  second: OrderAddress,
): boolean {
  return (
    first.lines.length === second.lines.length &&
    first.lines.every((line, index) => line === second.lines[index])
  )
}
