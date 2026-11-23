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
import type { TypeSingleProductSkeleton } from "./TypeSingleProduct";
import type { TypeSliderComponentSkeleton } from "./TypeSliderComponent";
import type { TypeSmartSortingProductsSliderComponentSkeleton } from "./TypeSmartSortingProductsSliderComponent";
import type { TypeTextComponentSkeleton } from "./TypeTextComponent";
import type { TypeVideoComponentSkeleton } from "./TypeVideoComponent";

/**
 * Fields type definition for content type 'TypeSectionComponent'
 * @name TypeSectionComponentFields
 * @type {TypeSectionComponentFields}
 * @memberof TypeSectionComponent
 */
export interface TypeSectionComponentFields {
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     * @summary Internal name for editors to identify this component within Contentful. Not displayed in frontend.
     */
    name: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'backgroundColor' (Background Color)
     * @name Background Color
     * @localized false
     * @summary Background color for the section using a hex color code. Leave empty for transparent.
     */
    backgroundColor?: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'backgroundImageDesktop' (Background Image - Desktop)
     * @name Background Image - Desktop
     * @localized false
     * @summary Background image for desktop. Appears behind all section content.
     */
    backgroundImageDesktop?: EntryFieldTypes.AssetLink;
    /**
     * Field type definition for field 'backgroundImageMobile' (Background Image - Mobile)
     * @name Background Image - Mobile
     * @localized false
     * @summary Background image for mobile. If not provided, desktop image is used.
     */
    backgroundImageMobile?: EntryFieldTypes.AssetLink;
    /**
     * Field type definition for field 'padding' (Padding)
     * @name Padding
     * @localized false
     * @summary Amount of space inside the section around content. Defaults to None.
     */
    padding?: EntryFieldTypes.Symbol<"large" | "medium" | "none" | "small">;
    /**
     * Field type definition for field 'minHeightDesktop' (Min. Height - Desktop)
     * @name Min. Height - Desktop
     * @localized false
     * @summary Minimum section height on desktop in pixels.
     */
    minHeightDesktop?: EntryFieldTypes.Integer;
    /**
     * Field type definition for field 'minHeightMobile' (Min. Height - Mobile)
     * @name Min. Height - Mobile
     * @localized false
     * @summary Minimum section height on mobile in pixels. Uses desktop value if not provided.
     */
    minHeightMobile?: EntryFieldTypes.Integer;
    /**
     * Field type definition for field 'verticalContentAlignment' (Vertical Content Alignment)
     * @name Vertical Content Alignment
     * @localized false
     * @summary Vertical alignment of content within the section. Defaults to Middle.
     */
    verticalContentAlignment?: EntryFieldTypes.Symbol<"Bottom" | "Middle" | "Top">;
    /**
     * Field type definition for field 'horizontalContentAlignment' (Horizontal Content Alignment)
     * @name Horizontal Content Alignment
     * @localized false
     * @summary Horizontal alignment of content within the section. Defaults to Center.
     */
    horizontalContentAlignment?: EntryFieldTypes.Symbol<"Center" | "Left" | "Right">;
    /**
     * Field type definition for field 'content' (Content)
     * @name Content
     * @localized false
     * @summary All content inside this section. Add any combination of components.
     */
    content?: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<TypeAccordionComponentSkeleton | TypeButtonComponentSkeleton | TypeCountdownTimerComponentSkeleton | TypeDividerComponentSkeleton | TypeGridComponentSkeleton | TypeImageComponentSkeleton | TypeLinkComponentSkeleton | TypeProductSliderComponentSkeleton | TypeRichTextComponentSkeleton | TypeSectionComponentSkeleton | TypeSingleProductSkeleton | TypeSliderComponentSkeleton | TypeSmartSortingProductsSliderComponentSkeleton | TypeTextComponentSkeleton | TypeVideoComponentSkeleton>>;
    /**
     * Field type definition for field 'isPriorityImage' (Priority image (LCP))
     * @name Priority image (LCP)
     * @localized false
     * @summary By default, the page loads the first image it finds as fast as possible. Turn this on only if your main image, like a hero banner, sits below another image on the page and is loading too slowly. Only set this on one image per page.
     */
    isPriorityImage?: EntryFieldTypes.Boolean;
}

/**
 * Entry skeleton type definition for content type 'SectionComponent' (Section)
 * @name TypeSectionComponentSkeleton
 * @type {TypeSectionComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:13:43.951Z
 * @version 49
 */
export type TypeSectionComponentSkeleton = EntrySkeletonType<TypeSectionComponentFields, "SectionComponent">;
/**
 * Entry type definition for content type 'SectionComponent' (Section)
 * @name TypeSectionComponent
 * @type {TypeSectionComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:13:43.951Z
 * @version 49
 */
export type TypeSectionComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeSectionComponentSkeleton, Modifiers, Locales>;

export function isTypeSectionComponent(entry: unknown): entry is TypeSectionComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'SectionComponent'
}

export type TypeSectionComponentWithoutLinkResolutionResponse = TypeSectionComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeSectionComponentWithoutUnresolvableLinksResponse = TypeSectionComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeSectionComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeSectionComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeSectionComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeSectionComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeSectionComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeSectionComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
