/**
 * The password policy here is used by the account form to guide the user,
 * but is not enforced by the oRPC. oRPC forwards backend service errors related to password validation.
 * The actual password policy is configured per-shop in the Panel
 * (`emailPassword.password` in the checkout configuration) and enforced by the
 * backend and `<scayle-auth>` web component at registration.
 * These values are for frontend guidance only and must be aligned
 * with the Panel configuration to prevent mismatches between frontend and backend validation.
 */

/** Shortest password the form and the oRPC schema accept. */
export const PASSWORD_MIN_LENGTH = 8

/** Longest password the form and the oRPC schema accept. */
export const PASSWORD_MAX_LENGTH = 70

/** Matches a whole string with no whitespace; an empty string also matches, so pair with `PASSWORD_MIN_LENGTH`. */
export const PASSWORD_NO_WHITESPACE = /^\S*$/

/** Requires at least one uppercase letter. */
export const PASSWORD_UPPERCASE = /[A-Z]/

/** Requires at least one lowercase letter. */
export const PASSWORD_LOWERCASE = /[a-z]/

/** Requires at least one digit. */
export const PASSWORD_DIGIT = /\d/

/** Requires at least one special character. */
export const PASSWORD_SPECIAL_CHARACTER = /[!@#$%^&*(),.?":{}|<>]/
