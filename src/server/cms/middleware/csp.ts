import { createCmsCspMiddleware } from '@scayle/storefront/cms'

/**
 * Hono middleware that adjusts Content-Security-Policy headers for CMS
 * editor/preview mode, using the active provider's CSP config.
 * Reads the resolved CMS service instance on `ctx.get('services')`, so it
 * must be registered after `createStorefrontRuntime()` mounts the service
 * registry middleware.
 *
 * `services` is optional here because the middleware runs on `/*`: a request
 * that resolves no country gets no storefront context, so the registry
 * middleware never populates the registries.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms
 */
export const cmsCspMiddleware = createCmsCspMiddleware(
  (ctx) => ctx.get('services')?.cms,
)
