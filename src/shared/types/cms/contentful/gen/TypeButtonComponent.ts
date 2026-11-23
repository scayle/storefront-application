import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeButtonComponent'
 * @name TypeButtonComponentFields
 * @type {TypeButtonComponentFields}
 * @memberof TypeButtonComponent
 */
export interface TypeButtonComponentFields {
    /**
     * Field type definition for field 'style' (Style)
     * @name Style
     * @localized false
     * @summary Visual appearance of the button. Defaults to Primary.
     */
    style?: EntryFieldTypes.Symbol<"accent" | "plain" | "primary" | "secondary">;
    /**
     * Field type definition for field 'text' (Text)
     * @name Text
     * @localized true
     * @summary The text displayed on the button.
     */
    text?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'url' (URL)
     * @name URL
     * @localized true
     * @summary The destination link when the button is clicked. Supports internal pages or external URLs.
     */
    url: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'openInNewTab' (OpenInNewTab)
     * @name OpenInNewTab
     * @localized false
     * @summary Whether to open the link in a new browser tab or not.
     */
    openInNewTab?: EntryFieldTypes.Boolean;
}

/**
 * Entry skeleton type definition for content type 'ButtonComponent' (Button)
 * @name TypeButtonComponentSkeleton
 * @type {TypeButtonComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:09:53.717Z
 * @version 25
 */
export type TypeButtonComponentSkeleton = EntrySkeletonType<TypeButtonComponentFields, "ButtonComponent">;
/**
 * Entry type definition for content type 'ButtonComponent' (Button)
 * @name TypeButtonComponent
 * @type {TypeButtonComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:09:53.717Z
 * @version 25
 */
export type TypeButtonComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeButtonComponentSkeleton, Modifiers, Locales>;

export function isTypeButtonComponent(entry: unknown): entry is TypeButtonComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'ButtonComponent'
}

export type TypeButtonComponentWithoutLinkResolutionResponse = TypeButtonComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeButtonComponentWithoutUnresolvableLinksResponse = TypeButtonComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeButtonComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeButtonComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeButtonComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeButtonComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeButtonComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeButtonComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
