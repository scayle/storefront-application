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
import type { TypeSmartSortingProductsSliderComponentSkeleton } from "./TypeSmartSortingProductsSliderComponent";
import type { TypeTextComponentSkeleton } from "./TypeTextComponent";
import type { TypeVideoComponentSkeleton } from "./TypeVideoComponent";

/**
 * Fields type definition for content type 'TypeSliderComponent'
 * @name TypeSliderComponentFields
 * @type {TypeSliderComponentFields}
 * @memberof TypeSliderComponent
 */
export interface TypeSliderComponentFields {
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     * @summary Internal name for editors to identify this component within Contentful. Not displayed in frontend.
     */
    name: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'content' (Content)
     * @name Content
     * @localized false
     * @summary Items to display in the slider. Each item appears as a separate slide.
     */
    content?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeAccordionComponentSkeleton | TypeButtonComponentSkeleton | TypeCountdownTimerComponentSkeleton | TypeDividerComponentSkeleton | TypeGridComponentSkeleton | TypeImageComponentSkeleton | TypeLinkComponentSkeleton | TypeProductSliderComponentSkeleton | TypeRichTextComponentSkeleton | TypeSectionComponentSkeleton | TypeSliderComponentSkeleton | TypeSmartSortingProductsSliderComponentSkeleton | TypeTextComponentSkeleton | TypeVideoComponentSkeleton>>;
    /**
     * Field type definition for field 'showNavigationArrows' (Show Navigation Arrows)
     * @name Show Navigation Arrows
     * @localized false
     * @summary When enabled, displays left and right arrow buttons for navigation. Defaults to enabled.
     */
    showNavigationArrows?: EntryFieldTypes.Boolean;
    /**
     * Field type definition for field 'showPaginationIndicators' (Show Pagination Indicators)
     * @name Show Pagination Indicators
     * @localized false
     * @summary When enabled, displays dots at the bottom showing active slide. Defaults to enabled.
     */
    showPaginationIndicators?: EntryFieldTypes.Boolean;
}

/**
 * Entry skeleton type definition for content type 'SliderComponent' (Slider)
 * @name TypeSliderComponentSkeleton
 * @type {TypeSliderComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:14:07.300Z
 * @version 27
 */
export type TypeSliderComponentSkeleton = EntrySkeletonType<TypeSliderComponentFields, "SliderComponent">;
/**
 * Entry type definition for content type 'SliderComponent' (Slider)
 * @name TypeSliderComponent
 * @type {TypeSliderComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:14:07.300Z
 * @version 27
 */
export type TypeSliderComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeSliderComponentSkeleton, Modifiers, Locales>;

export function isTypeSliderComponent(entry: unknown): entry is TypeSliderComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'SliderComponent'
}

export type TypeSliderComponentWithoutLinkResolutionResponse = TypeSliderComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeSliderComponentWithoutUnresolvableLinksResponse = TypeSliderComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeSliderComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeSliderComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeSliderComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeSliderComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeSliderComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeSliderComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
