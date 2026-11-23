import type { SharedProps } from '@scayle/storefront'

/**
 * Every prop an Inertia page receives regardless of which page it is.
 *
 * An alias for the SDK's `SharedProps`, which `src/shared/types/global.d.ts`
 * augments with this application's shared data. The alias exists because
 * `@inertiajs/core` types `Page['props']` as an intersection with its own
 * index-signature `PageProps`, so reading a key off it can never be a compile
 * error. `usePage()` in `src/client/composables/usePage.ts` returns this type
 * instead, which makes a misspelled prop name an error and makes
 * `keyof PageProps` the literal union of prop names — the type partial-reload
 * keys are checked against.
 *
 * Page-specific props are not part of this contract. A page declares those with
 * `defineProps`; a component that needs to read another page's prop passes it
 * as the type argument to `usePage()`.
 */
export type PageProps = SharedProps
