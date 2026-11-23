import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeSingleProduct'
 * @name TypeSingleProductFields
 * @type {TypeSingleProductFields}
 * @memberof TypeSingleProduct
 */
export interface TypeSingleProductFields {
    /**
     * Field type definition for field 'product' (product)
     * @name product
     * @localized false
     */
    product: EntryFieldTypes.Integer;
    /**
     * Field type definition for field 'badge' (badge)
     * @name badge
     * @localized false
     */
    badge?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'highUrgency' (highUrgency)
     * @name highUrgency
     * @localized false
     */
    highUrgency?: EntryFieldTypes.Boolean;
    /**
     * Field type definition for field 'backgroundColor' (backgroundColor)
     * @name backgroundColor
     * @localized false
     */
    backgroundColor?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'textColor' (textColor)
     * @name textColor
     * @localized false
     */
    textColor?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'showCountdown' (showCountdown)
     * @name showCountdown
     * @localized false
     */
    showCountdown?: EntryFieldTypes.Boolean;
    /**
     * Field type definition for field 'countdownEndDate' (countdownEndDate)
     * @name countdownEndDate
     * @localized false
     */
    countdownEndDate?: EntryFieldTypes.Date;
}

/**
 * Entry skeleton type definition for content type 'singleProduct' (Single Product)
 * @name TypeSingleProductSkeleton
 * @type {TypeSingleProductSkeleton}
 * @author 033rk0BFoMjeQRvAJDpjVr
 * @since 2026-07-02T09:18:53.136Z
 * @version 19
 */
export type TypeSingleProductSkeleton = EntrySkeletonType<TypeSingleProductFields, "singleProduct">;
/**
 * Entry type definition for content type 'singleProduct' (Single Product)
 * @name TypeSingleProduct
 * @type {TypeSingleProduct}
 * @author 033rk0BFoMjeQRvAJDpjVr
 * @since 2026-07-02T09:18:53.136Z
 * @version 19
 */
export type TypeSingleProduct<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeSingleProductSkeleton, Modifiers, Locales>;

export function isTypeSingleProduct(entry: unknown): entry is TypeSingleProductWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'singleProduct'
}

export type TypeSingleProductWithoutLinkResolutionResponse = TypeSingleProduct<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeSingleProductWithoutUnresolvableLinksResponse = TypeSingleProduct<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeSingleProductWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeSingleProduct<"WITH_ALL_LOCALES", Locales>;
export type TypeSingleProductWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeSingleProduct<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeSingleProductWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeSingleProduct<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
