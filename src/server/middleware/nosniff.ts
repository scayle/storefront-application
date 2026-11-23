import { createMiddleware } from 'hono/factory'

/**
 * Sets `X-Content-Type-Options: nosniff` on every response, including static
 * assets.
 *
 * The full baseline (`securityHeadersMiddleware`) is registered after
 * `serveStaticAssets` because it has to sit after `cmsCspMiddleware`, which
 * needs the storefront runtime. Static responses would otherwise carry no
 * security headers, and content-type sniffing is the one that matters for
 * served files.
 *
 * Deliberately one `set` rather than a second `secureHeaders()`: registering it
 * ahead of the baseline means its after-next phase unwinds later, so anything
 * else it wrote would overwrite the baseline instead of the other way around.
 *
 * @returns Hono middleware that writes `X-Content-Type-Options: nosniff`
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/security-headers
 */
export const nosniffMiddleware = createMiddleware(async (ctx, next) => {
  await next()
  ctx.res.headers.set('X-Content-Type-Options', 'nosniff')
})
