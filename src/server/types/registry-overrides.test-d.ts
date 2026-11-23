/**
 * Type-level assertions for the registry override contract.
 *
 * Every assertion here is checked by `pnpm typecheck`, because the file is inside the
 * tsconfig `include`, and a failing `@ts-expect-error` is itself an error. No
 * runtime test framework is involved, because none of this has runtime behavior.
 *
 * What it pins down:
 *
 * 1. An overridden slot carries this shop's type, not the SDK's.
 * 2. A slot this shop does not override keeps the SDK type.
 * 3. A slot the SDK does not ship is reachable once declared.
 * 4. An override stays assignable to the SDK slot it replaces, which is what
 *    keeps SDK-internal reads of the registry working.
 * 5. A misspelled slot fails to compile instead of resolving to `unknown`.
 */
import type { MapperRegistry, ServiceRegistry } from '@scayle/storefront'
import type { CustomerMapper, SearchMapper } from '@scayle/storefront/mappers'
import type { SearchService } from '@scayle/storefront/services'
import type { ProductMapperService } from '@server/services/mappers/product-mapper'
import type { PromotionMapperService } from '@server/services/mappers/promotion-mapper'
import type { ServerI18nService } from '@server/services/i18n'

/** Fails to compile unless `T` is exactly `true`. */
type Expect<T extends true> = T

/** Invariant type equality, so a wider or narrower match does not pass. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

// 1. An overridden slot carries this shop's type.
export type PromotionSlotIsShopSubclass = Expect<
  Equals<MapperRegistry['promotion'], PromotionMapperService>
>
// The basket mapper reads `VariantIncludes`, which only this shop's subclass has.
export type ProductSlotIsShopSubclass = Expect<
  Equals<MapperRegistry['product'], ProductMapperService>
>

// 2. A slot the SDK does not ship is reachable once declared.
export type I18nSlotIsAdded = Expect<
  Equals<MapperRegistry['i18n'], ServerI18nService>
>

// 3. A misspelled slot fails to compile. Before the index signature was removed
//    both of these resolved to `unknown` and shipped without complaint.
export type MisspelledMapperSlotIsRejected =
  // @ts-expect-error `categroy` is not a declared mapper slot.
  MapperRegistry['categroy']
export type MisspelledServiceSlotIsRejected =
  // @ts-expect-error `categroy` is not a declared service slot either.
  ServiceRegistry['categroy']

// 4. A slot this shop does not override keeps the SDK type. `customer` is
//    registered as `CustomerMapperService`, but nothing reaches a method that
//    subclass adds, so the slot is deliberately left un-overridden and stays the
//    SDK base mapper. It used to be a separate `CustomerMapping<Customer,
//    OrderSummary>` contract — the last slot typed through a generic parameter,
//    whose arguments were always the SDK's own types.
export type CustomerSlotIsSDKBaseMapper = Expect<
  Equals<MapperRegistry['customer'], CustomerMapper>
>
// `search` is registered as this shop's subclass too, which only overrides SDK
// methods, so the slot stays the SDK base mapper.
export type SearchSlotIsSDKBaseMapper = Expect<
  Equals<MapperRegistry['search'], SearchMapper>
>
// This shop declares no service slots, so `search` is the SDK slot unchanged.
export type SearchServiceSlotIsSDKService = Expect<
  Equals<ServiceRegistry['search'], SearchService>
>
