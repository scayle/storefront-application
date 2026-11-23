import { ORPCError, safe } from '@orpc/client'
import { usePage } from '@inertiajs/vue3'
import { mocked } from 'storybook/test'
import type { ORPCErrorCode } from '@orpc/client'
import type { Customer, Wishlist } from '@scayle/storefront/types'
import type { RpcClient } from '../src/client/utils/orpc'
import { buildSearchRoute } from '../src/shared/routes'
import { createMockListingProduct } from '../src/test/mock-data/products'

/**
 * Resolves a procedure call the way the safe oRPC client does on success.
 *
 * @param data - Procedure output
 * @returns The safe result the client hands to the caller
 */
export function succeed<T>(data: T) {
  return safe(Promise.resolve(data))
}

/**
 * Rejects a procedure call the way the safe oRPC client does on an error. By
 * default the error is one the procedure declares in `.errors()`, so the caller
 * sees `isDefined: true` and the error `code`. Pass `{ defined: false }` for a
 * procedure without that error in `.errors()`, where a failure reaches the
 * client with `isDefined: false`.
 *
 * @param code - Error code the procedure answers with, for example `FORBIDDEN`
 * @param options - How the client classifies the error
 * @param options.defined - Whether the procedure declares `code` in `.errors()`
 * @returns The safe result the client hands to the caller
 *
 * @example
 * ```ts
 * updatePassword: () => fail('FORBIDDEN'),
 * updatePersonalInfo: () => fail('INTERNAL_SERVER_ERROR', { defined: false }),
 * ```
 */
export function fail(code: ORPCErrorCode, { defined = true } = {}) {
  return safe(Promise.reject(new ORPCError(code, { defined })))
}

/** Signed-in customer that stories and the profile procedures share. */
export const storybookCustomer: Customer = {
  id: 12345,
  idHash: 'storybook-customer',
  email: 'jane.doe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  birthDate: '1990-01-01',
  gender: 'f',
  title: undefined,
  isGuest: false,
  authentication: { type: 'password' },
  groups: [],
  segments: [],
}

/**
 * Replaces the `customer` page prop for the current story, on top of the page
 * `preview.ts` provides, where `customer` is `null`. Call it in `beforeEach`.
 *
 * @param customer - Customer the story renders as signed in
 *
 * @example
 * ```ts
 * beforeEach() {
 *   signInAs(storybookCustomer)
 * },
 * ```
 */
export function signInAs(customer: Customer) {
  const page = usePage()
  mocked(usePage).mockReturnValue({
    ...page,
    props: { ...page.props, customer },
  })
}

const wishlist: Wishlist = { items: [] }

/**
 * Answers every router procedure with a success, so any control a story
 * renders can be used without an error. Storybook injects it under
 * `RPC_CLIENT_KEY` in `preview.ts`.
 *
 * Mutations have no visible effect: the mocked `router.reload` finishes
 * without a request, so the page props never come back changed. For the same
 * reason `wishlist.toggle` always answers `added`, even for a product that is
 * already on the wishlist.
 *
 * To replace a procedure in one story, provide a client in a decorator that
 * spreads this one and answers with `succeed` or `fail`.
 * `SFSearchField.stories.ts` is the worked example for a success,
 * `SFProfilePasswordManagement.stories.ts` for a failure.
 */
export const storybookRpcClient: RpcClient = {
  basket: {
    add: () => succeed({ addedWithReducedQuantity: false }),
    update: () => succeed({ addedWithReducedQuantity: false }),
    changeVariant: () => succeed({ addedWithReducedQuantity: false }),
    remove: () => succeed(undefined),
    applyPromotionCode: () => succeed({ success: true as const }),
    removePromotion: () => succeed({ success: true as const }),
    createOneTimeCheckoutToken: () =>
      succeed({ checkoutJwt: 'storybook.checkout.jwt', finalPriceInCents: 0 }),
  },
  wishlist: {
    add: () => succeed({ success: true as const, wishlist }),
    remove: () => succeed({ success: true as const, wishlist }),
    toggle: () =>
      succeed({ success: true as const, action: 'added' as const, wishlist }),
  },
  auth: {
    refreshAccessToken: () => succeed({ accessToken: 'storybook' }),
    exchangeAuthCode: () => succeed({ accessToken: 'storybook' }),
    logout: () => succeed(undefined),
  },
  profile: {
    updatePersonalInfo: () => succeed(storybookCustomer),
    updatePassword: () => succeed(storybookCustomer),
  },
  search: {
    getSuggestions: ({ term }) =>
      succeed({
        categories: [],
        products: [],
        navigationItems: [],
        showAllResultsLink: buildSearchRoute(term),
      }),
    resolve: () => succeed({ result: null }),
  },
  cms: {
    getProductsByIds: ({ ids }) =>
      succeed(
        ids.map((id) =>
          createMockListingProduct({ id, name: `Product ${id}` }),
        ),
      ),
    getProductsBySmartSorting: ({ limit = 10 }) =>
      succeed(
        Array.from({ length: limit }, (_, index) =>
          createMockListingProduct({
            id: index + 1,
            name: `Smart sorting product ${index + 1}`,
          }),
        ),
      ),
  },
}
