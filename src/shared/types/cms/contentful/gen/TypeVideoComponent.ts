import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeVideoComponent'
 * @name TypeVideoComponentFields
 * @type {TypeVideoComponentFields}
 * @memberof TypeVideoComponent
 */
export interface TypeVideoComponentFields {
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     * @summary Internal name for editors to identify this component within Contentful. Not displayed in frontend.
     */
    name: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'video' (Video)
     * @name Video
     * @localized false
     * @summary The video file to display.
     */
    video: EntryFieldTypes.AssetLink;
    /**
     * Field type definition for field 'previewImageDesktop' (Preview Image - Desktop)
     * @name Preview Image - Desktop
     * @localized false
     * @summary Thumbnail image shown before video plays on desktop.
     */
    previewImageDesktop: EntryFieldTypes.AssetLink;
    /**
     * Field type definition for field 'previewImageMobile' (Preview Image - Mobile)
     * @name Preview Image - Mobile
     * @localized false
     * @summary Thumbnail image for mobile. If not provided, desktop image is used.
     */
    previewImageMobile?: EntryFieldTypes.AssetLink;
    /**
     * Field type definition for field 'aspectRatio' (Aspect Ratio)
     * @name Aspect Ratio
     * @localized false
     * @summary Shape and proportions of the video player. Defaults to 16:9.
     */
    aspectRatio?: EntryFieldTypes.Symbol<"16:9" | "1:1" | "4:3">;
    /**
     * Field type definition for field 'autoplay' (Autoplay)
     * @name Autoplay
     * @localized false
     * @summary When enabled, video starts automatically on page load. Defaults to enabled.
     */
    autoplay?: EntryFieldTypes.Boolean;
    /**
     * Field type definition for field 'muted' (Muted)
     * @name Muted
     * @localized false
     * @summary When enabled, video plays without sound. Defaults to enabled.
     */
    muted?: EntryFieldTypes.Boolean;
    /**
     * Field type definition for field 'loop' (Loop)
     * @name Loop
     * @localized false
     * @summary When enabled, video restarts automatically when it ends. Defaults to enabled.
     */
    loop?: EntryFieldTypes.Boolean;
    /**
     * Field type definition for field 'showControls' (Show Controls)
     * @name Show Controls
     * @localized false
     * @summary When enabled, displays video player controls. Defaults to disabled.
     */
    showControls?: EntryFieldTypes.Boolean;
}

/**
 * Entry skeleton type definition for content type 'VideoComponent' (Video)
 * @name TypeVideoComponentSkeleton
 * @type {TypeVideoComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:14:53.008Z
 * @version 23
 */
export type TypeVideoComponentSkeleton = EntrySkeletonType<TypeVideoComponentFields, "VideoComponent">;
/**
 * Entry type definition for content type 'VideoComponent' (Video)
 * @name TypeVideoComponent
 * @type {TypeVideoComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:14:53.008Z
 * @version 23
 */
export type TypeVideoComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeVideoComponentSkeleton, Modifiers, Locales>;

export function isTypeVideoComponent(entry: unknown): entry is TypeVideoComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'VideoComponent'
}

export type TypeVideoComponentWithoutLinkResolutionResponse = TypeVideoComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeVideoComponentWithoutUnresolvableLinksResponse = TypeVideoComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeVideoComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeVideoComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeVideoComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeVideoComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeVideoComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeVideoComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
