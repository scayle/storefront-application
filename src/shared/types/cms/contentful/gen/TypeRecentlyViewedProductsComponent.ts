import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeRecentlyViewedProductsComponent'
 * @name TypeRecentlyViewedProductsComponentFields
 * @type {TypeRecentlyViewedProductsComponentFields}
 * @memberof TypeRecentlyViewedProductsComponent
 */
export interface TypeRecentlyViewedProductsComponentFields {
    /**
     * Field type definition for field 'padding' (Padding)
     * @name Padding
     * @localized false
     * @summary Amount of space around the component. Defaults to None.
     */
    padding?: EntryFieldTypes.Symbol<"large" | "medium" | "none" | "small">;
}

/**
 * Entry skeleton type definition for content type 'RecentlyViewedProductsComponent' (Recently Viewed Products)
 * @name TypeRecentlyViewedProductsComponentSkeleton
 * @type {TypeRecentlyViewedProductsComponentSkeleton}
 * @author 1mPDct26qEqijQwVE3S88Y
 * @since 2025-09-17T12:39:41.572Z
 * @version 11
 */
export type TypeRecentlyViewedProductsComponentSkeleton = EntrySkeletonType<TypeRecentlyViewedProductsComponentFields, "RecentlyViewedProductsComponent">;
/**
 * Entry type definition for content type 'RecentlyViewedProductsComponent' (Recently Viewed Products)
 * @name TypeRecentlyViewedProductsComponent
 * @type {TypeRecentlyViewedProductsComponent}
 * @author 1mPDct26qEqijQwVE3S88Y
 * @since 2025-09-17T12:39:41.572Z
 * @version 11
 */
export type TypeRecentlyViewedProductsComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeRecentlyViewedProductsComponentSkeleton, Modifiers, Locales>;

export function isTypeRecentlyViewedProductsComponent(entry: unknown): entry is TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'RecentlyViewedProductsComponent'
}

export type TypeRecentlyViewedProductsComponentWithoutLinkResolutionResponse = TypeRecentlyViewedProductsComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse = TypeRecentlyViewedProductsComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeRecentlyViewedProductsComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeRecentlyViewedProductsComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeRecentlyViewedProductsComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeRecentlyViewedProductsComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeRecentlyViewedProductsComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeRecentlyViewedProductsComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
