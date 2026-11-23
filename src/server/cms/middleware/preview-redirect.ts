import { createCmsPreviewRedirectMiddleware } from '@scayle/storefront/cms'

/**
 * Hono middleware that redirects a CMS preview request onto the path the edited
 * content item lives on, for providers whose editor opens a placeholder path.
 * Reads `getPreviewRedirectPath` off the resolved CMS service instance on
 * `ctx.get('services')`, so it must be registered after `createStorefrontRuntime()`
 * mounts the service registry middleware.
 *
 * `services` is optional here because the middleware runs on `/*`: a request that
 * resolves no country gets no storefront context, so the registry middleware never
 * populates the registries. The method is optional too, since only some providers
 * need a preview redirect.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms
 */
export const cmsPreviewRedirectMiddleware = createCmsPreviewRedirectMiddleware(
  (ctx) =>
    ctx
      .get('services')
      ?.cms.getPreviewRedirectPath?.(ctx.get('request'), ctx.req.path),
)
