import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeRichTextComponent'
 * @name TypeRichTextComponentFields
 * @type {TypeRichTextComponentFields}
 * @memberof TypeRichTextComponent
 */
export interface TypeRichTextComponentFields {
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     * @summary Internal name for editors to identify this component within Contentful. Not displayed in frontend.
     */
    name: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'content' (content)
     * @name content
     * @localized true
     * @summary Formatted text content with support for headings, bold, italic, lists, and links.
     */
    content: EntryFieldTypes.RichText;
}

/**
 * Entry skeleton type definition for content type 'RichTextComponent' (Rich Text)
 * @name TypeRichTextComponentSkeleton
 * @type {TypeRichTextComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:13:13.398Z
 * @version 19
 */
export type TypeRichTextComponentSkeleton = EntrySkeletonType<TypeRichTextComponentFields, "RichTextComponent">;
/**
 * Entry type definition for content type 'RichTextComponent' (Rich Text)
 * @name TypeRichTextComponent
 * @type {TypeRichTextComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:13:13.398Z
 * @version 19
 */
export type TypeRichTextComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeRichTextComponentSkeleton, Modifiers, Locales>;

export function isTypeRichTextComponent(entry: unknown): entry is TypeRichTextComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'RichTextComponent'
}

export type TypeRichTextComponentWithoutLinkResolutionResponse = TypeRichTextComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeRichTextComponentWithoutUnresolvableLinksResponse = TypeRichTextComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeRichTextComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeRichTextComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeRichTextComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeRichTextComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeRichTextComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeRichTextComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
