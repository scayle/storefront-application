import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";
import type { TypeImageComponentSkeleton } from "./TypeImageComponent";
import type { TypeTextComponentSkeleton } from "./TypeTextComponent";

/**
 * Fields type definition for content type 'TypeLinkComponent'
 * @name TypeLinkComponentFields
 * @type {TypeLinkComponentFields}
 * @memberof TypeLinkComponent
 */
export interface TypeLinkComponentFields {
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     * @summary Internal name for editors to identify this component within Contentful. Not displayed in frontend.
     */
    name: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'url' (URL)
     * @name URL
     * @localized true
     * @summary Destination link when clicked. Supports internal pages or external URLs.
     */
    url: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'openInNewTab' (OpenInNewTab)
     * @name OpenInNewTab
     * @localized false
     * @summary Whether to open the link in a new browser tab or not.
     */
    openInNewTab?: EntryFieldTypes.Boolean;
    /**
     * Field type definition for field 'content' (Content)
     * @name Content
     * @localized true
     * @summary Content that becomes clickable (images, text, or other components).
     */
    content?: EntryFieldTypes.EntryLink<TypeImageComponentSkeleton | TypeTextComponentSkeleton>;
}

/**
 * Entry skeleton type definition for content type 'LinkComponent' (Link)
 * @name TypeLinkComponentSkeleton
 * @type {TypeLinkComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:12:10.916Z
 * @version 23
 */
export type TypeLinkComponentSkeleton = EntrySkeletonType<TypeLinkComponentFields, "LinkComponent">;
/**
 * Entry type definition for content type 'LinkComponent' (Link)
 * @name TypeLinkComponent
 * @type {TypeLinkComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:12:10.916Z
 * @version 23
 */
export type TypeLinkComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeLinkComponentSkeleton, Modifiers, Locales>;

export function isTypeLinkComponent(entry: unknown): entry is TypeLinkComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'LinkComponent'
}

export type TypeLinkComponentWithoutLinkResolutionResponse = TypeLinkComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeLinkComponentWithoutUnresolvableLinksResponse = TypeLinkComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeLinkComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeLinkComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeLinkComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeLinkComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeLinkComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeLinkComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
