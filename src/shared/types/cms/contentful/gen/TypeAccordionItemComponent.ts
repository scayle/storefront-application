import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";
import type { TypeAccordionComponentSkeleton } from "./TypeAccordionComponent";
import type { TypeButtonComponentSkeleton } from "./TypeButtonComponent";
import type { TypeCountdownTimerComponentSkeleton } from "./TypeCountdownTimerComponent";
import type { TypeDividerComponentSkeleton } from "./TypeDividerComponent";
import type { TypeGridComponentSkeleton } from "./TypeGridComponent";
import type { TypeImageComponentSkeleton } from "./TypeImageComponent";
import type { TypeLinkComponentSkeleton } from "./TypeLinkComponent";
import type { TypeProductSliderComponentSkeleton } from "./TypeProductSliderComponent";
import type { TypeRichTextComponentSkeleton } from "./TypeRichTextComponent";
import type { TypeSectionComponentSkeleton } from "./TypeSectionComponent";
import type { TypeSliderComponentSkeleton } from "./TypeSliderComponent";
import type { TypeSmartSortingProductsSliderComponentSkeleton } from "./TypeSmartSortingProductsSliderComponent";
import type { TypeTextComponentSkeleton } from "./TypeTextComponent";
import type { TypeVideoComponentSkeleton } from "./TypeVideoComponent";

/**
 * Fields type definition for content type 'TypeAccordionItemComponent'
 * @name TypeAccordionItemComponentFields
 * @type {TypeAccordionItemComponentFields}
 * @memberof TypeAccordionItemComponent
 */
export interface TypeAccordionItemComponentFields {
    /**
     * Field type definition for field 'title' (Title)
     * @name Title
     * @localized true
     * @summary The clickable heading that users click to expand or collapse this accordion item.
     */
    title: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'content' (Content)
     * @name Content
     * @localized false
     * @summary Content that appears when this accordion item is expanded. Hidden by default.
     */
    content?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeAccordionComponentSkeleton | TypeButtonComponentSkeleton | TypeCountdownTimerComponentSkeleton | TypeDividerComponentSkeleton | TypeGridComponentSkeleton | TypeImageComponentSkeleton | TypeLinkComponentSkeleton | TypeProductSliderComponentSkeleton | TypeRichTextComponentSkeleton | TypeSectionComponentSkeleton | TypeSliderComponentSkeleton | TypeSmartSortingProductsSliderComponentSkeleton | TypeTextComponentSkeleton | TypeVideoComponentSkeleton>>;
}

/**
 * Entry skeleton type definition for content type 'AccordionItemComponent' (AccordionItem)
 * @name TypeAccordionItemComponentSkeleton
 * @type {TypeAccordionItemComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:09:23.717Z
 * @version 27
 */
export type TypeAccordionItemComponentSkeleton = EntrySkeletonType<TypeAccordionItemComponentFields, "AccordionItemComponent">;
/**
 * Entry type definition for content type 'AccordionItemComponent' (AccordionItem)
 * @name TypeAccordionItemComponent
 * @type {TypeAccordionItemComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:09:23.717Z
 * @version 27
 */
export type TypeAccordionItemComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeAccordionItemComponentSkeleton, Modifiers, Locales>;

export function isTypeAccordionItemComponent(entry: unknown): entry is TypeAccordionItemComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'AccordionItemComponent'
}

export type TypeAccordionItemComponentWithoutLinkResolutionResponse = TypeAccordionItemComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeAccordionItemComponentWithoutUnresolvableLinksResponse = TypeAccordionItemComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeAccordionItemComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeAccordionItemComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeAccordionItemComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeAccordionItemComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeAccordionItemComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeAccordionItemComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
