import type { ChainModifiers, Entry, EntryFieldTypes, EntrySkeletonType, LocaleCode } from "contentful";

/**
 * Fields type definition for content type 'TypeCountdownTimerComponent'
 * @name TypeCountdownTimerComponentFields
 * @type {TypeCountdownTimerComponentFields}
 * @memberof TypeCountdownTimerComponent
 */
export interface TypeCountdownTimerComponentFields {
    /**
     * Field type definition for field 'endDate' (End Date )
     * @name End Date 
     * @localized false
     */
    endDate: EntryFieldTypes.Date;
    /**
     * Field type definition for field 'size' (Size)
     * @name Size
     * @localized false
     */
    size?: EntryFieldTypes.Symbol<"large" | "small">;
    /**
     * Field type definition for field 'name' (Name)
     * @name Name
     * @localized false
     */
    name?: EntryFieldTypes.Symbol;
}

/**
 * Entry skeleton type definition for content type 'CountdownTimerComponent' (Countdown Timer)
 * @name TypeCountdownTimerComponentSkeleton
 * @type {TypeCountdownTimerComponentSkeleton}
 * @author 033rk0BFoMjeQRvAJDpjVr
 * @since 2026-06-02T10:48:02.693Z
 * @version 3
 */
export type TypeCountdownTimerComponentSkeleton = EntrySkeletonType<TypeCountdownTimerComponentFields, "CountdownTimerComponent">;
/**
 * Entry type definition for content type 'CountdownTimerComponent' (Countdown Timer)
 * @name TypeCountdownTimerComponent
 * @type {TypeCountdownTimerComponent}
 * @author 033rk0BFoMjeQRvAJDpjVr
 * @since 2026-06-02T10:48:02.693Z
 * @version 3
 */
export type TypeCountdownTimerComponent<Modifiers extends ChainModifiers, Locales extends LocaleCode = LocaleCode> = Entry<TypeCountdownTimerComponentSkeleton, Modifiers, Locales>;

export function isTypeCountdownTimerComponent(entry: unknown): entry is TypeCountdownTimerComponentWithoutUnresolvableLinksResponse {
    const candidate = entry as { sys?: { contentType?: { sys?: { id?: string } } } };
    return candidate.sys?.contentType?.sys?.id === 'CountdownTimerComponent'
}

export type TypeCountdownTimerComponentWithoutLinkResolutionResponse = TypeCountdownTimerComponent<"WITHOUT_LINK_RESOLUTION", LocaleCode>;
export type TypeCountdownTimerComponentWithoutUnresolvableLinksResponse = TypeCountdownTimerComponent<"WITHOUT_UNRESOLVABLE_LINKS", LocaleCode>;
export type TypeCountdownTimerComponentWithAllLocalesResponse<Locales extends LocaleCode = LocaleCode> = TypeCountdownTimerComponent<"WITH_ALL_LOCALES", Locales>;
export type TypeCountdownTimerComponentWithAllLocalesAndWithoutLinkResolutionResponse<Locales extends LocaleCode = LocaleCode> = TypeCountdownTimerComponent<"WITHOUT_LINK_RESOLUTION" | "WITH_ALL_LOCALES", Locales>;
export type TypeCountdownTimerComponentWithAllLocalesAndWithoutUnresolvableLinksResponse<Locales extends LocaleCode = LocaleCode> = TypeCountdownTimerComponent<"WITHOUT_UNRESOLVABLE_LINKS" | "WITH_ALL_LOCALES", Locales>;
