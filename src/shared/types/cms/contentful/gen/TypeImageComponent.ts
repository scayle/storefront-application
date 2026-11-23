import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeImageComponent'
 * @name TypeImageComponentFields
 * @type {TypeImageComponentFields}
 * @memberof TypeImageComponent
 */
export interface TypeImageComponentFields {
    /**
     * Field type definition for field 'imageDesktop' (Image - Desktop)
     * @name Image - Desktop
     * @localized false
     * @summary Image displayed on desktop and tablet. Used on mobile if no mobile image is provided.
     */
    imageDesktop: EntryFieldTypes.AssetLink;
    /**
     * Field type definition for field 'aspectRatioDesktop' (Aspect Ratio - Desktop)
     * @name Aspect Ratio - Desktop
     * @localized false
     * @summary Image proportions on desktop. Defaults to Original.
     */
    aspectRatioDesktop?: EntryFieldTypes.Symbol<"16:9" | "1:1" | "4:3" | "original">;
    /**
     * Field type definition for field 'imageMobile' (Image - Mobile)
     * @name Image - Mobile
     * @localized false
     * @summary Image displayed on mobile devices. If not provided, desktop image is used.
     */
    imageMobile?: EntryFieldTypes.AssetLink;
    /**
     * Field type definition for field 'aspectRatioMobile' (Aspect Ratio - Mobile)
     * @name Aspect Ratio - Mobile
     * @localized false
     * @summary Image proportions on mobile. Defaults to Original.
     */
    aspectRatioMobile?: EntryFieldTypes.Symbol<"16:9" | "1:1" | "4:3" | "original">;
    /**
     * Field type definition for field 'altText' (Alt Text)
     * @name Alt Text
     * @localized true
     * @summary Text description of the image for accessibility and SEO.
     */
    altText: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'isPriorityImage' (Priority image (LCP))
     * @name Priority image (LCP)
     * @localized false
     * @summary By default, the page loads the first image it finds as fast as possible. Turn this on only if your main image, like a hero banner, sits below another image on the page and is loading too slowly. Only set this on one image per page.
     */
    isPriorityImage?: EntryFieldTypes.Boolean;
}

/**
 * Entry skeleton type definition for content type 'ImageComponent' (Image)
 * @name TypeImageComponentSkeleton
 * @type {TypeImageComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:11:51.797Z
 * @version 25
 */
export type TypeImageComponentSkeleton = EntrySkeletonType<TypeImageComponentFields, "ImageComponent">;
/**
 * Entry type definition for content type 'ImageComponent' (Image)
 * @name TypeImageComponent
 * @type {TypeImageComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:11:51.797Z
 * @version 25
 */
export type TypeImageComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeImageComponentSkeleton, Modifiers, Locales>;

export function isTypeImageComponent(entry: unknown): entry is TypeImageComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'ImageComponent'
}

export type TypeImageComponentWithoutLinkResolutionResponse = TypeImageComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeImageComponentWithoutUnresolvableLinksResponse = TypeImageComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeImageComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeImageComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeImageComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeImageComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeImageComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeImageComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
