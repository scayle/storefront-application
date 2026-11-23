import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeTextComponent'
 * @name TypeTextComponentFields
 * @type {TypeTextComponentFields}
 * @memberof TypeTextComponent
 */
export interface TypeTextComponentFields {
    /**
     * Field type definition for field 'textType' (Text Type)
     * @name Text Type
     * @localized false
     * @summary HTML element type for the text. Defaults to paragraph.
     */
    textType?: EntryFieldTypes.Symbol<"h1" | "h2" | "h3" | "h4" | "p">;
    /**
     * Field type definition for field 'content' (Content)
     * @name Content
     * @localized true
     * @summary The text to display.
     */
    content?: EntryFieldTypes.Text;
}

/**
 * Entry skeleton type definition for content type 'TextComponent' (Text)
 * @name TypeTextComponentSkeleton
 * @type {TypeTextComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:14:29.385Z
 * @version 23
 */
export type TypeTextComponentSkeleton = EntrySkeletonType<TypeTextComponentFields, "TextComponent">;
/**
 * Entry type definition for content type 'TextComponent' (Text)
 * @name TypeTextComponent
 * @type {TypeTextComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:14:29.385Z
 * @version 23
 */
export type TypeTextComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeTextComponentSkeleton, Modifiers, Locales>;

export function isTypeTextComponent(entry: unknown): entry is TypeTextComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'TextComponent'
}

export type TypeTextComponentWithoutLinkResolutionResponse = TypeTextComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeTextComponentWithoutUnresolvableLinksResponse = TypeTextComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeTextComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeTextComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeTextComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeTextComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeTextComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeTextComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
