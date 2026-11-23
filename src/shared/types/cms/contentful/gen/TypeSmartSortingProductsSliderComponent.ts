import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeSmartSortingProductsSliderComponent'
 * @name TypeSmartSortingProductsSliderComponentFields
 * @type {TypeSmartSortingProductsSliderComponentFields}
 * @memberof TypeSmartSortingProductsSliderComponent
 */
export interface TypeSmartSortingProductsSliderComponentFields {
    /**
     * Field type definition for field 'smartSortingKey' (Smart Sorting Key)
     * @name Smart Sorting Key
     * @localized false
     * @summary SCAYLE Storefront Smart Sorting Key (algorithm) used to automatically select and sort products.
     */
    smartSortingKey: EntryFieldTypes.Symbol<"Balanced Offerings" | "Inventory Optimization" | "Luxury Promotion" | "New Arrivals" | "Recently Popular" | "Revenue Max" | "Sales Push" | "Stock Coverage" | "Topseller" | "Trending">;
    /**
     * Field type definition for field 'title' (Title)
     * @name Title
     * @localized true
     * @summary Heading displayed above the product slider.
     */
    title?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'categoryId' (CategoryId)
     * @name CategoryId
     * @localized false
     * @summary Limit products to a specific category by entering the category ID number.
     */
    categoryId?: EntryFieldTypes.Integer;
    /**
     * Field type definition for field 'brandId' (BrandId)
     * @name BrandId
     * @localized false
     * @summary Limit products to a specific brand by entering the brand ID number.
     */
    brandId?: EntryFieldTypes.Integer;
    /**
     * Field type definition for field 'limit' (Limit)
     * @name Limit
     * @localized false
     * @summary Maximum number of products to display in the slider.
     */
    limit?: EntryFieldTypes.Integer;
}

/**
 * Entry skeleton type definition for content type 'smartSortingProductsSliderComponent' (Smart Sorting Product Slider)
 * @name TypeSmartSortingProductsSliderComponentSkeleton
 * @type {TypeSmartSortingProductsSliderComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-11-03T12:21:33.625Z
 * @version 15
 */
export type TypeSmartSortingProductsSliderComponentSkeleton = EntrySkeletonType<TypeSmartSortingProductsSliderComponentFields, "smartSortingProductsSliderComponent">;
/**
 * Entry type definition for content type 'smartSortingProductsSliderComponent' (Smart Sorting Product Slider)
 * @name TypeSmartSortingProductsSliderComponent
 * @type {TypeSmartSortingProductsSliderComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-11-03T12:21:33.625Z
 * @version 15
 */
export type TypeSmartSortingProductsSliderComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeSmartSortingProductsSliderComponentSkeleton, Modifiers, Locales>;

export function isTypeSmartSortingProductsSliderComponent(entry: unknown): entry is TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'smartSortingProductsSliderComponent'
}

export type TypeSmartSortingProductsSliderComponentWithoutLinkResolutionResponse = TypeSmartSortingProductsSliderComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse = TypeSmartSortingProductsSliderComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeSmartSortingProductsSliderComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeSmartSortingProductsSliderComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeSmartSortingProductsSliderComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeSmartSortingProductsSliderComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeSmartSortingProductsSliderComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeSmartSortingProductsSliderComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
