/**
 * Base set of page props a product listing navigation refreshes via an Inertia
 * partial reload. Pagination uses the list as-is; sorting and filtering spread
 * it and add the props their interaction also changes (e.g. `sorting`,
 * `appliedFilters`).
 */
export const PRODUCT_LISTING_RELOAD_PROPS = ['products', 'pagination', 'meta']
