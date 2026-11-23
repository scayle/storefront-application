import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";
import type { TypeAccordionComponentSkeleton } from "./TypeAccordionComponent";
import type { TypeButtonComponentSkeleton } from "./TypeButtonComponent";
import type { TypeCountdownTimerComponentSkeleton } from "./TypeCountdownTimerComponent";
import type { TypeDividerComponentSkeleton } from "./TypeDividerComponent";
import type { TypeGridComponentSkeleton } from "./TypeGridComponent";
import type { TypeImageComponentSkeleton } from "./TypeImageComponent";
import type { TypeLinkComponentSkeleton } from "./TypeLinkComponent";
import type { TypeProductSliderComponentSkeleton } from "./TypeProductSliderComponent";
import type { TypeRecentlyViewedProductsComponentSkeleton } from "./TypeRecentlyViewedProductsComponent";
import type { TypeRichTextComponentSkeleton } from "./TypeRichTextComponent";
import type { TypeSectionComponentSkeleton } from "./TypeSectionComponent";
import type { TypeSingleProductSkeleton } from "./TypeSingleProduct";
import type { TypeSliderComponentSkeleton } from "./TypeSliderComponent";
import type { TypeTextComponentSkeleton } from "./TypeTextComponent";
import type { TypeVideoComponentSkeleton } from "./TypeVideoComponent";

/**
 * Fields type definition for content type 'TypeProductListingPageComponent'
 * @name TypeProductListingPageComponentFields
 * @type {TypeProductListingPageComponentFields}
 * @memberof TypeProductListingPageComponent
 */
export interface TypeProductListingPageComponentFields {
    /**
     * Field type definition for field 'title' (Title)
     * @name Title
     * @localized false
     * @summary Serves as internal title only and will not be displayed.
     */
    title?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'slug' (Slug)
     * @name Slug
     * @localized false
     * @summary The relative URL slug to the specific Product Listing Page, e.g. "c/c-123456".
     */
    slug: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'teaserContent' (Teaser Content)
     * @name Teaser Content
     * @localized true
     * @summary Content displayed at the top of the product listing page, above the product grid.
     */
    teaserContent?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeCountdownTimerComponentSkeleton | TypeImageComponentSkeleton | TypeSectionComponentSkeleton | TypeSliderComponentSkeleton | TypeTextComponentSkeleton>>;
    /**
     * Field type definition for field 'seoContent' (SEO Content)
     * @name SEO Content
     * @localized true
     * @summary Content displayed at the bottom of the product listing page, after the product grid. Useful for SEO.
     */
    seoContent?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeAccordionComponentSkeleton | TypeButtonComponentSkeleton | TypeCountdownTimerComponentSkeleton | TypeDividerComponentSkeleton | TypeGridComponentSkeleton | TypeImageComponentSkeleton | TypeLinkComponentSkeleton | TypeProductSliderComponentSkeleton | TypeRecentlyViewedProductsComponentSkeleton | TypeRichTextComponentSkeleton | TypeSectionComponentSkeleton | TypeSingleProductSkeleton | TypeSliderComponentSkeleton | TypeTextComponentSkeleton | TypeVideoComponentSkeleton>>;
    /**
     * Field type definition for field 'socialShareImage' (Social Share Image)
     * @name Social Share Image
     * @localized true
     * @summary Image shown when this page is shared on social media or messaging apps.
     */
    socialShareImage?: EntryFieldTypes.AssetLink;
}

/**
 * Entry skeleton type definition for content type 'productListingPageComponent' (Product Listing Page)
 * @name TypeProductListingPageComponentSkeleton
 * @type {TypeProductListingPageComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-27T14:12:05.895Z
 * @version 53
 */
export type TypeProductListingPageComponentSkeleton = EntrySkeletonType<TypeProductListingPageComponentFields, "productListingPageComponent">;
/**
 * Entry type definition for content type 'productListingPageComponent' (Product Listing Page)
 * @name TypeProductListingPageComponent
 * @type {TypeProductListingPageComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-27T14:12:05.895Z
 * @version 53
 */
export type TypeProductListingPageComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeProductListingPageComponentSkeleton, Modifiers, Locales>;

export function isTypeProductListingPageComponent(entry: unknown): entry is TypeProductListingPageComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'productListingPageComponent'
}

export type TypeProductListingPageComponentWithoutLinkResolutionResponse = TypeProductListingPageComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeProductListingPageComponentWithoutUnresolvableLinksResponse = TypeProductListingPageComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeProductListingPageComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeProductListingPageComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeProductListingPageComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeProductListingPageComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeProductListingPageComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeProductListingPageComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
