import { createBase, createOrpcAuthMiddleware } from '@scayle/storefront'

/**
 * The root oRPC procedure builder for public (unauthenticated) routes, carrying
 * the storefront `RequestContext` and the shared error catalogue. Use it for
 * procedures that run for guests and signed-in customers alike, such as catalog
 * reads or basket operations keyed off the session.
 *
 * Composed from the SDK's {@link createBase} factory. The `UNAUTHORIZED` error
 * is declared by the factory so every procedure shares one typed auth error; the
 * server entry suppresses its log by matching the `UNAUTHORIZED` code rather
 * than an `instanceof` check.
 *
 * @example
 * ```ts
 * export const getProductsByIdsDefinition = defineRpc({
 *   route: { method: 'GET', summary: 'Fetch CMS products by IDs' },
 *   input: getProductsByIdsInput,
 *   output: getProductsByIdsOutput,
 *   errors: {},
 *   handler: async ({ input, context }) => {
 *     // context.request.session is available; no access token is required.
 *     return context.storefront.storefrontAPI.products.getByIds(input.ids)
 *   },
 * })
 *
 * export const cmsRouter = {
 *   getProductsByIds: buildRpc(base, getProductsByIdsDefinition),
 * }
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/rpc-api
 */
export const base = createBase()

/**
 * Authenticated oRPC procedure builder: composes the SDK's
 * {@link createOrpcAuthMiddleware}, which rejects guests with the typed
 * `UNAUTHORIZED` error and injects a non-null `accessToken` into the handler
 * context. Build protected procedures on this instead of repeating the token
 * check. A guest call to a procedure built on `authed` fails before the handler
 * runs. Rebuilding an SDK RPC that `createProfileRouter` puts behind the same
 * middleware uses this builder too.
 *
 * @example
 * ```ts
 * // index.ts
 * export const apiRouter = {
 *   profile: {
 *     ...createProfileRouter(base),
 *     updatePassword: buildRpc(authed, {
 *       ...updatePasswordDefinition,
 *       input: updatePasswordDefinition.input.extend({
 *         newPassword: z.string().min(PASSWORD_MIN_LENGTH),
 *       }),
 *     }),
 *   },
 * }
 * ```
 */
export const authed = base.use(createOrpcAuthMiddleware(base))
