/**
 * Page payload for the `scayle` placeholder provider, which renders static
 * placeholder content and carries no generated content types. The open map
 * mirrors the SDK's payload fallback so provider-agnostic files compile when
 * no `CMS_PROVIDER` is selected. Provider-agnostic files import this shape
 * through the `@cms-shared` alias, which Vite points at the selected
 * `CMS_PROVIDER`.
 */
export type CMSPageData = Record<string, unknown>
