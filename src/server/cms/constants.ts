/**
 * CMS slug that represents the homepage.
 *
 * Shared by the CMS homepage controller (the slug it fetches), `ssr-routes.ts` (root and
 * `/homepage` route mounting), and the Storyblok slug resolver (default slug when
 * the request is for `/`). Keep all three in sync via this constant so routing,
 * provider lookups, and hreflang generation cannot drift.
 */
export const HOMEPAGE_SLUG = 'homepage'

/**
 * Default logo path used for `OnlineStore` JSON-LD on the homepage.
 *
 * Exported so external developers forking the template can override by swapping
 * this constant (or re-exporting their own) rather than editing the controller.
 */
export const DEFAULT_LOGO_PATH = '/logo.svg'
