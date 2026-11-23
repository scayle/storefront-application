import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeProductSliderComponent'
 * @name TypeProductSliderComponentFields
 * @type {TypeProductSliderComponentFields}
 * @memberof TypeProductSliderComponent
 */
export interface TypeProductSliderComponentFields {
    /**
     * Field type definition for field 'title' (Title)
     * @name Title
     * @localized true
     * @summary Heading displayed above the product slider.
     */
    title?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'products' (Products)
     * @name Products
     * @localized false
     */
    products?: EntryFieldTypes.Object;
}

/**
 * Entry skeleton type definition for content type 'productSliderComponent' (Product Slider)
 * @name TypeProductSliderComponentSkeleton
 * @type {TypeProductSliderComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-09-24T09:06:02.396Z
 * @version 19
 */
export type TypeProductSliderComponentSkeleton = EntrySkeletonType<TypeProductSliderComponentFields, "productSliderComponent">;
/**
 * Entry type definition for content type 'productSliderComponent' (Product Slider)
 * @name TypeProductSliderComponent
 * @type {TypeProductSliderComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-09-24T09:06:02.396Z
 * @version 19
 */
export type TypeProductSliderComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeProductSliderComponentSkeleton, Modifiers, Locales>;

export function isTypeProductSliderComponent(entry: unknown): entry is TypeProductSliderComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'productSliderComponent'
}

export type TypeProductSliderComponentWithoutLinkResolutionResponse = TypeProductSliderComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeProductSliderComponentWithoutUnresolvableLinksResponse = TypeProductSliderComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeProductSliderComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeProductSliderComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeProductSliderComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeProductSliderComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeProductSliderComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeProductSliderComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
