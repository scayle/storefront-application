/**
 * A selectable preferred delivery day for the subscription delivery-day
 * dropdown.
 */
export interface PreferredDeliveryDate {
  /** Day of month (e.g. 1, 15). */
  day: number
  /** Human-readable label for the option. */
  label: string
}
