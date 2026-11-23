import type { Entry, EntryCollection, EntrySkeletonType } from 'contentful'
import type {
  TypePageComponentWithoutLinkResolutionResponse,
  TypePageComponentWithoutUnresolvableLinksResponse,
  TypeProductListingPageComponentWithoutLinkResolutionResponse,
  TypeProductListingPageComponentWithoutUnresolvableLinksResponse,
} from './gen'

/**
 * Resolved Contentful content element passed to the block dispatch component.
 * Compatible with the generated `isType*Component()` type guards which narrows
 * to specific component types at runtime.
 */
export type ContentfulContentElement = Entry<
  EntrySkeletonType,
  'WITHOUT_UNRESOLVABLE_LINKS',
  string
>

/** Resolved Contentful entry types returned by the CMS provider. */
export type ContentfulEntry =
  | TypePageComponentWithoutUnresolvableLinksResponse
  | TypeProductListingPageComponentWithoutUnresolvableLinksResponse

/**
 * Untransformed Contentful entry where linked references are kept as link
 * objects (`{ sys: { type: 'Link' } }`) instead of being inlined. The
 * Contentful Live Preview SDK requires this untransformed shape to compute
 * merged updates, so it is fetched only for editor/preview sessions.
 */
export type ContentfulRawEntry =
  | TypePageComponentWithoutLinkResolutionResponse
  | TypeProductListingPageComponentWithoutLinkResolutionResponse

/**
 * Untransformed source data for the Contentful Live Preview SDK.
 * `includes` carries the linked entries/assets needed to resolve links
 * client-side after each live update before rendering.
 */
export interface ContentfulPreviewSource {
  /** Untransformed entry passed to `ContentfulLivePreview.subscribe`. */
  entry: ContentfulRawEntry
  /** Linked entries/assets used to resolve links after live updates. */
  includes: EntryCollection<EntrySkeletonType>['includes']
}

/**
 * Contentful page payload passed from server to client via Inertia props.
 *
 * Carries no `[key: string]: unknown` index signature: an object with an
 * unexpected key fails to compile instead of slipping through as `unknown`.
 * Provider-agnostic files import this shape through the `@cms-shared` alias,
 * which Vite points at the selected `CMS_PROVIDER`.
 */
export interface CMSPageData {
  /** Resolved Contentful entry with all linked references. */
  entry: ContentfulEntry
  /**
   * Untransformed entry + includes for the Contentful Live Preview SDK.
   * Present only in editor/preview sessions.
   */
  previewSource?: ContentfulPreviewSource
}

export * from './gen'
