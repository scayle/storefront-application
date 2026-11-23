import type {
  PageComponent,
  ProductlistingpageComponent,
} from './gen/contentstack'

export type * from './gen/contentstack'

/**
 * Extracts child block types from parent blocks with content arrays.
 * Captures nested-only types like `AccordionItemComponent` (which lives in
 * `AccordionComponent.content` but not in `PageComponent.content`) so the
 * union stays in sync with the generated schema without manual updates.
 */
type NestedBlock<T> = T extends { content: (infer U)[] | undefined } ? U : never

type PageContentBlock = NonNullable<PageComponent['content']>[number]

/**
 * Union of all generated Contentstack block types, including nested-only types
 * like AccordionItemComponent that don't appear directly in PageComponent.content.
 */
export type ContentstackBlock = PageContentBlock | NestedBlock<PageContentBlock>

/** Union of all root-level Contentstack page content types. */
export type ContentstackPageContent =
  PageComponent | ProductlistingpageComponent

/**
 * Contentstack page payload passed from server to client via Inertia props.
 *
 * Carries no `[key: string]: unknown` index signature: an object with an
 * unexpected key fails to compile instead of slipping through as `unknown`.
 * Provider-agnostic files import this shape through the `@cms-shared` alias,
 * which Vite points at the selected `CMS_PROVIDER`.
 */
export interface CMSPageData {
  /** Resolved Contentstack entry with all referenced content. */
  entry: ContentstackPageContent
}
