import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";
import type { TypeAccordionComponentSkeleton } from "./TypeAccordionComponent";
import type { TypeButtonComponentSkeleton } from "./TypeButtonComponent";
import type { TypeCountdownTimerComponentSkeleton } from "./TypeCountdownTimerComponent";
import type { TypeDividerComponentSkeleton } from "./TypeDividerComponent";
import type { TypeImageComponentSkeleton } from "./TypeImageComponent";
import type { TypeLinkComponentSkeleton } from "./TypeLinkComponent";
import type { TypeProductSliderComponentSkeleton } from "./TypeProductSliderComponent";
import type { TypeRichTextComponentSkeleton } from "./TypeRichTextComponent";
import type { TypeSectionComponentSkeleton } from "./TypeSectionComponent";
import type { TypeSingleProductSkeleton } from "./TypeSingleProduct";
import type { TypeSliderComponentSkeleton } from "./TypeSliderComponent";
import type { TypeSmartSortingProductsSliderComponentSkeleton } from "./TypeSmartSortingProductsSliderComponent";
import type { TypeTextComponentSkeleton } from "./TypeTextComponent";
import type { TypeVideoComponentSkeleton } from "./TypeVideoComponent";

/**
 * Fields type definition for content type 'TypeGridComponent'
 * @name TypeGridComponentFields
 * @type {TypeGridComponentFields}
 * @memberof TypeGridComponent
 */
export interface TypeGridComponentFields {
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     * @summary Internal name for editors to identify this component within Contentful. Not displayed in frontend.
     */
    name: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'numberOfColumnsDesktop' (Number of Columns - Desktop)
     * @name Number of Columns - Desktop
     * @localized false
     * @summary Number of columns displayed on desktop and tablet screens.
     */
    numberOfColumnsDesktop: EntryFieldTypes.Integer;
    /**
     * Field type definition for field 'numberOfColumnsMobile' (Number of Columns - Mobile)
     * @name Number of Columns - Mobile
     * @localized false
     * @summary Number of columns displayed on mobile devices.
     */
    numberOfColumnsMobile: EntryFieldTypes.Integer;
    /**
     * Field type definition for field 'gapColumnDesktop' (Gap size between Columns - Desktop)
     * @name Gap size between Columns - Desktop
     * @localized false
     * @summary Horizontal spacing between columns on mobile. Defaults to None.
     */
    gapColumnDesktop?: EntryFieldTypes.Symbol<"large" | "medium" | "none" | "small">;
    /**
     * Field type definition for field 'gapColumnMobile' (Gap size between Columns - Mobile)
     * @name Gap size between Columns - Mobile
     * @localized false
     * @summary Horizontal spacing between columns on mobile. Defaults to None.
     */
    gapColumnMobile?: EntryFieldTypes.Symbol<"large" | "medium" | "none" | "small">;
    /**
     * Field type definition for field 'gapRowDesktop' (Gap size between Rows - Desktop)
     * @name Gap size between Rows - Desktop
     * @localized false
     * @summary Vertical spacing between rows on desktop. Defaults to None.
     */
    gapRowDesktop?: EntryFieldTypes.Symbol<"large" | "medium" | "none" | "small">;
    /**
     * Field type definition for field 'gapRowMobile' (Gap size between Rows - Mobile)
     * @name Gap size between Rows - Mobile
     * @localized false
     * @summary Vertical spacing between rows on mobile. Defaults to None.
     */
    gapRowMobile?: EntryFieldTypes.Symbol<"large" | "medium" | "none" | "small">;
    /**
     * Field type definition for field 'verticalContentAlignment' (Vertical Content Alignment)
     * @name Vertical Content Alignment
     * @localized false
     * @summary Vertical alignment of content within grid cells. Defaults to Middle.
     */
    verticalContentAlignment?: EntryFieldTypes.Symbol<"Bottom" | "Middle" | "Top">;
    /**
     * Field type definition for field 'horizontalContentAlignment' (Horizontal Content Alignment)
     * @name Horizontal Content Alignment
     * @localized false
     * @summary Horizontal alignment of content within grid cells. Defaults to Center.
     */
    horizontalContentAlignment?: EntryFieldTypes.Symbol<"Center" | "Left" | "Right">;
    /**
     * Field type definition for field 'columnContent' (Column Content)
     * @name Column Content
     * @localized false
     * @summary Content items to display in the grid. Each item appears in its own grid cell.
     */
    columnContent?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeAccordionComponentSkeleton | TypeButtonComponentSkeleton | TypeCountdownTimerComponentSkeleton | TypeDividerComponentSkeleton | TypeGridComponentSkeleton | TypeImageComponentSkeleton | TypeLinkComponentSkeleton | TypeProductSliderComponentSkeleton | TypeRichTextComponentSkeleton | TypeSectionComponentSkeleton | TypeSingleProductSkeleton | TypeSliderComponentSkeleton | TypeSmartSortingProductsSliderComponentSkeleton | TypeTextComponentSkeleton | TypeVideoComponentSkeleton>>;
}

/**
 * Entry skeleton type definition for content type 'GridComponent' (Grid)
 * @name TypeGridComponentSkeleton
 * @type {TypeGridComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:11:28.080Z
 * @version 41
 */
export type TypeGridComponentSkeleton = EntrySkeletonType<TypeGridComponentFields, "GridComponent">;
/**
 * Entry type definition for content type 'GridComponent' (Grid)
 * @name TypeGridComponent
 * @type {TypeGridComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:11:28.080Z
 * @version 41
 */
export type TypeGridComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeGridComponentSkeleton, Modifiers, Locales>;

export function isTypeGridComponent(entry: unknown): entry is TypeGridComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'GridComponent'
}

export type TypeGridComponentWithoutLinkResolutionResponse = TypeGridComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeGridComponentWithoutUnresolvableLinksResponse = TypeGridComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeGridComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeGridComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeGridComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeGridComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeGridComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeGridComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
