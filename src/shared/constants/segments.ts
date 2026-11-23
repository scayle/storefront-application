import type { PageProps } from '@shared/types/PageProps'

/**
 * Lists the shared once props whose value depends on the customer's segments,
 * for example a header navigation tree your shop picks by segment. The client
 * keeps a once prop across visits, so a login or logout reloads these props
 * explicitly, otherwise the previous customer's value stays until a full page
 * load. The list ships empty, since no shared prop in the Storefront
 * Application varies by segment. Add a once prop here when your shop makes it
 * vary by segment.
 */
export const SEGMENT_DEPENDENT_ONCE_PROPS: readonly (keyof PageProps)[] = []
