import {
  createAuthRouter,
  createBasketRouter,
  createProfileRouter,
  createSearchRouter,
  createWishlistRouter,
} from '@scayle/storefront'
import { base } from './base'
import { cmsRouter } from './cms'

// Listed one domain at a time, on this application's `base`, so middleware
// added there applies to the SDK RPCs. A domain the SDK adds later stays off
// this router until it is assigned here. To customize one RPC, replace its
// key. The `buildRpc` JSDoc in `@scayle/storefront` has examples.
// See https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/rpc-api
export const apiRouter = {
  basket: createBasketRouter(base),
  wishlist: createWishlistRouter(base),
  auth: createAuthRouter(base),
  search: createSearchRouter(base),
  profile: createProfileRouter(base),
  cms: cmsRouter,
}

export type APIRouter = typeof apiRouter
