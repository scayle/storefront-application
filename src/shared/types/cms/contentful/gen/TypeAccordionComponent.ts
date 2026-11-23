import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";
import type { TypeAccordionItemComponentSkeleton } from "./TypeAccordionItemComponent";

/**
 * Fields type definition for content type 'TypeAccordionComponent'
 * @name TypeAccordionComponentFields
 * @type {TypeAccordionComponentFields}
 * @memberof TypeAccordionComponent
 */
export interface TypeAccordionComponentFields {
    /**
     * Field type definition for field 'title' (Title)
     * @name Title
     * @localized true
     * @summary Optional heading displayed above all accordion items.
     */
    title?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'content' (Content)
     * @name Content
     * @localized false
     * @summary List of accordion items that users can expand or collapse.
     */
    content: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeAccordionItemComponentSkeleton>>;
}

/**
 * Entry skeleton type definition for content type 'AccordionComponent' (Accordion)
 * @name TypeAccordionComponentSkeleton
 * @type {TypeAccordionComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:08:37.216Z
 * @version 19
 */
export type TypeAccordionComponentSkeleton = EntrySkeletonType<TypeAccordionComponentFields, "AccordionComponent">;
/**
 * Entry type definition for content type 'AccordionComponent' (Accordion)
 * @name TypeAccordionComponent
 * @type {TypeAccordionComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:08:37.216Z
 * @version 19
 */
export type TypeAccordionComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeAccordionComponentSkeleton, Modifiers, Locales>;

export function isTypeAccordionComponent(entry: unknown): entry is TypeAccordionComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'AccordionComponent'
}

export type TypeAccordionComponentWithoutLinkResolutionResponse = TypeAccordionComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeAccordionComponentWithoutUnresolvableLinksResponse = TypeAccordionComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeAccordionComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeAccordionComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeAccordionComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeAccordionComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeAccordionComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeAccordionComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
