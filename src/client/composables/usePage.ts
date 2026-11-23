// eslint-disable-next-line no-restricted-imports -- the one place Inertia's own `usePage` is read; everything else goes through the wrapper below
import { usePage as useInertiaPage } from '@inertiajs/vue3'
import type { Page } from '@inertiajs/core'
import type { UnionToIntersection } from 'type-fest'
import type { Components, PageComponentName } from '@scayle/storefront'
import type { PageProps } from '@shared/types/PageProps'

/**
 * Inertia's own per-visit props, present alongside the shared ones on every page.
 */
type VisitProps = Pick<Page['props'], 'errors' | 'deferred'>

/**
 * The props the named pages declare, merged into one object with every field
 * optional.
 *
 * Optional because a caller reading a page prop can be mounted on a page that
 * does not send it, and because a page prop can be deferred — absent until its
 * request resolves. Merged rather than left a union so a caller naming several
 * pages reads any of their props off a single object.
 */
export type PagePropsOf<TName extends PageComponentName> = Partial<
  UnionToIntersection<Components[TName]>
>

/**
 * Merges the shared contract with the named pages' props, unioning the type of
 * any key both sides declare.
 *
 * A page prop and a shared prop can carry the same key — `wishlist` does today
 * (see `src/shared/types/global.d.ts`). At runtime `render()` spreads page props
 * over shared data, so the page prop wins on its own page and the shared value
 * applies everywhere else; a caller naming that page reads whichever one its
 * mount point receives. Hence a union: intersecting the two would drop a `null`
 * only one side declares, and would collapse the key to `never` when the two
 * types do not overlap at all.
 */
type MergeProps<TShared extends object, TPage extends object> = Omit<
  TShared,
  keyof TPage
> &
  Omit<TPage, keyof TShared> & {
    [TKey in keyof TShared & keyof TPage]?: TShared[TKey] | TPage[TKey]
  }

/**
 * The Inertia page object with `component` narrowed to a registered page name
 * and `props` narrowed to this application's contract, plus the props of the
 * pages named in `TName`. Every other field (`url`, `version`, `flash`, history
 * flags, …) is Inertia's own.
 */
export type TypedPage<TName extends PageComponentName = never> = Omit<
  Page,
  'component' | 'props'
> & {
  component: PageComponentName
  // Naming no page yields the shared contract on its own. The guard is needed
  // because `Components[never]` is `never`, which would collapse the merge.
  props: [TName] extends [never]
    ? PageProps & VisitProps
    : MergeProps<PageProps & VisitProps, PagePropsOf<TName>>
}

/**
 * Provides the current Inertia page with typed props.
 *
 * Prefer this over `usePage` from `@inertiajs/vue3`: the library types
 * `Page['props']` as an intersection with its own index-signature `PageProps`,
 * so every prop read — a misspelled one included — resolves to `unknown`
 * instead of failing to compile.
 *
 * Only shared props are in the contract by default, since those are the ones
 * present on every page. To read a prop that belongs to specific pages, name
 * them as the type argument: the prop types then come from the `Components`
 * registry in `src/shared/types/global.d.ts`, so a prop no named page declares
 * is a compile error and a renamed page prop breaks the read here rather than
 * silently resolving to `undefined`.
 *
 * @returns The reactive page object, with typed `component` and `props`.
 *
 * @example
 * ```ts
 * // Shared props, checked against the contract
 * const page = usePage()
 * page.props.campaign // Campaign | null
 * page.props.campain // compile error
 *
 * // Props of one page, from its own `defineProps`
 * const page = usePage<'Search'>()
 * page.props.pagination?.totalItems
 *
 * // Props of several pages, merged
 * const page = usePage<'Search' | 'ProductListing'>()
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/page-rendering
 */
export function usePage<
  TName extends PageComponentName = never,
>(): TypedPage<TName> {
  return useInertiaPage() as unknown as TypedPage<TName>
}
