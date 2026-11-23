import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeDividerComponent'
 * @name TypeDividerComponentFields
 * @type {TypeDividerComponentFields}
 * @memberof TypeDividerComponent
 */
export interface TypeDividerComponentFields {
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     * @summary Internal name for editors to identify this component within Contentful. Not displayed in frontend.
     */
    name: EntryFieldTypes.Symbol;
    /**
     * Field type definition for field 'height' (Height)
     * @name Height
     * @localized false
     * @summary Amount of vertical spacing. Defaults to Small.
     */
    height: EntryFieldTypes.Symbol<"large" | "medium" | "small">;
    /**
     * Field type definition for field 'showLine' (Show Line)
     * @name Show Line
     * @localized false
     * @summary When enabled, displays a horizontal line. When disabled, creates only empty space.
     */
    showLine?: EntryFieldTypes.Boolean;
}

/**
 * Entry skeleton type definition for content type 'DividerComponent' (Divider)
 * @name TypeDividerComponentSkeleton
 * @type {TypeDividerComponentSkeleton}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:11:07.632Z
 * @version 19
 */
export type TypeDividerComponentSkeleton = EntrySkeletonType<TypeDividerComponentFields, "DividerComponent">;
/**
 * Entry type definition for content type 'DividerComponent' (Divider)
 * @name TypeDividerComponent
 * @type {TypeDividerComponent}
 * @author 0Ln49wSMlaoa4viI4GmzAg
 * @since 2025-08-13T06:11:07.632Z
 * @version 19
 */
export type TypeDividerComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeDividerComponentSkeleton, Modifiers, Locales>;

export function isTypeDividerComponent(entry: unknown): entry is TypeDividerComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'DividerComponent'
}

export type TypeDividerComponentWithoutLinkResolutionResponse = TypeDividerComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeDividerComponentWithoutUnresolvableLinksResponse = TypeDividerComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeDividerComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeDividerComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeDividerComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeDividerComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeDividerComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeDividerComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
