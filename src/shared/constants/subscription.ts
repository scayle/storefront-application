/**
 * Delivery days of the month a customer can pick. Kept here rather than in
 * config because it does not vary per tenant today. Move it to config when a
 * tenant needs to override it.
 */
export const PREFERRED_DELIVERY_DAYS = [1, 15] as const
