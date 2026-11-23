/**
 * Document event that returns the express checkout button to its default state.
 * Dispatched when the size dropdown is abandoned or an express error occurs.
 * The checkout web component listens for this event on `document`.
 */
export const EXPRESS_CHECKOUT_RESET_EVENT = 'scayle:express:reset' as const
