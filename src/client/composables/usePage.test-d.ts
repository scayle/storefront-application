/**
 * Type-level assertions for the page-prop contract.
 *
 * Checked by `pnpm typecheck` (vue-tsc), not by Vitest: every `@ts-expect-error`
 * below fails the typecheck the moment the error it expects stops happening. The
 * guarantees this file pins down are otherwise invisible to CI — a re-added index
 * signature on `SharedProps` or `Components`, or a `usePage` type parameter that
 * stops constraining, breaks no test and breaks no build.
 *
 * Nothing here runs. The reads are collected into returned objects so they are
 * neither unused nor side-effecting.
 */
import type { Wishlist } from '@scayle/storefront/types'
import { usePage } from './usePage'

/** Shared props are readable without naming a page; a misspelled one is not. */
export function sharedPropContract() {
  const page = usePage()

  return {
    campaign: page.props.campaign,
    navigation: page.props.navigation,
    // @ts-expect-error -- a misspelled shared prop must not compile
    misspelled: page.props.campain,
    // @ts-expect-error -- a page prop is out of scope until its page is named
    pageProp: page.props.pagination,
  }
}

/** `component` is the registered union, not `string`. */
export function componentContract() {
  const page = usePage()

  return {
    isSearch: page.component === 'Search',
    // @ts-expect-error -- an unregistered page name has no overlap with the union
    isUnregistered: page.component === 'DefinitelyNotAPage',
  }
}

/** Naming a page brings its own props into scope, and only its own. */
export function namedPageContract() {
  const page = usePage<'Search'>()

  return {
    totalItems: page.props.pagination?.totalItems,
    campaign: page.props.campaign,
    // @ts-expect-error -- `product` belongs to `ProductDetail`, which is not named
    product: page.props.product,
  }
}

/** The type argument is constrained to registered page names. */
export function unregisteredNameContract() {
  // @ts-expect-error -- an unregistered page name must not satisfy the constraint
  return usePage<'DefinitelyNotAPage'>()
}

/** Naming several pages merges their props into one object. */
export function mergedPagesContract() {
  const page = usePage<'Search' | 'ProductListing'>()

  return {
    totalItems: page.props.pagination?.totalItems,
    categoryId: page.props.category?.id,
  }
}

/**
 * A key both a page and `SharedProps` declare keeps both declared types. The
 * wishlist page declares `wishlist` as required and non-nullable while the
 * shared prop is optional and nullable, so the merged read must still accept
 * `null` — an intersection would drop it and hand callers a type that cannot
 * represent the failed-fetch case.
 */
export function collidingKeyContract() {
  const page = usePage<'Wishlist'>()
  const read = page.props.wishlist
  const sharedFetchFailed: typeof read = null
  const deferredNotResolved: typeof read = undefined
  const resolved: typeof read = {} as Wishlist

  return { read, sharedFetchFailed, deferredNotResolved, resolved }
}
