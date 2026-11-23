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
import type { TypeSmartSortingProductsSliderComponentSkeleton } from "./TypeSmartSortingProductsSliderComponent";
import type { TypeTextComponentSkeleton } from "./TypeTextComponent";
import type { TypeVideoComponentSkeleton } from "./TypeVideoComponent";

/**
 * Fields type definition for content type 'TypePageComponent'
 * @name TypePageComponentFields
 * @type {TypePageComponentFields}
 * @memberof TypePageComponent
 */
export interface TypePageComponentFields {
    /**
     * Field type definition for field 'title' (Title)
     * @name Title
     * @localized false
     * @summary Serves as internal title only and will not be displayed. It will however be used to generate the page slug.
     */
    title: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'slug' (Slug)
     * @name Slug
     * @localized false
     * @summary The manually set URL slug for this CMS page. Uses the title to generate the slug automatically if not set manually.
     */
    slug: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'metaTitle' (Meta Title)
     * @name Meta Title
     * @localized true
     * @summary Page title for browser tabs and search results. Keep under 60 characters for SEO.
     */
    metaTitle?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'metaDescription' (Meta Description)
     * @name Meta Description
     * @localized true
     * @summary Brief page description for search results. Keep under 160 characters.
     */
    metaDescription?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'robots' (Robots)
     * @name Robots
     * @localized false
     * @summary Controls how search engines index this page. Defaults to index/follow.
     */
    robots?: EntryFieldTypes.Symbol<"index, follow" | "index, nofollow" | "noindex, follow" | "noindex, nofollow">;
    /**
     * Field type definition for field 'content' (Content)
     * @name Content
     * @localized true
     * @summary Main page content. Add sections, images, text, and other components here.
     */
    content?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeAccordionComponentSkeleton | TypeButtonComponentSkeleton | TypeCountdownTimerComponentSkeleton | TypeDividerComponentSkeleton | TypeGridComponentSkeleton | TypeImageComponentSkeleton | TypeLinkComponentSkeleton | TypeProductSliderComponentSkeleton | TypeRecentlyViewedProductsComponentSkeleton | TypeRichTextComponentSkeleton | TypeSectionComponentSkeleton | TypeSingleProductSkeleton | TypeSliderComponentSkeleton | TypeSmartSortingProductsSliderComponentSkeleton | TypeTextComponentSkeleton | TypeVideoComponentSkeleton>>;
    /**
     * Field type definition for field 'socialShareImage' (Social Share Image)
     * @name Social Share Image
     * @localized true
     * @summary Image shown when this page is shared on social media or messaging apps.
     */
    socialShareImage?: EntryFieldTypes.AssetLink;
}

/**
 * Entry skeleton type definition for content type 'PageComponent' (Page)
 * @name TypePageComponentSkeleton
 * @type {TypePageComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:12:42.249Z
 * @version 51
 */
export type TypePageComponentSkeleton = EntrySkeletonType<TypePageComponentFields, "PageComponent">;
/**
 * Entry type definition for content type 'PageComponent' (Page)
 * @name TypePageComponent
 * @type {TypePageComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:12:42.249Z
 * @version 51
 */
export type TypePageComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypePageComponentSkeleton, Modifiers, Locales>;

export function isTypePageComponent(entry: unknown): entry is TypePageComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'PageComponent'
}

export type TypePageComponentWithoutLinkResolutionResponse = TypePageComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypePageComponentWithoutUnresolvableLinksResponse = TypePageComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypePageComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypePageComponent<"WITH_ALL_LOCALES", Locales>;
export type TypePageComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypePageComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypePageComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypePageComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
