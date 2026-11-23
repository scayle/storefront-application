import type { ISbStoryData } from '@storyblok/js'
import type {
  PageComponent,
  ProductListingPageComponent,
} from './gen/components/storyblok-components'

export type * from './gen/storyblok'
export type * from './gen/components/storyblok-components'

/**
 * Extracts child block types from parent blocks with content arrays.
 * Captures nested-only types like `AccordionItemComponent` (which lives in
 * `AccordionComponent.content` but not in `PageComponent.content`) so the
 * union stays in sync with the generated schema without manual updates.
 */
type NestedBlock<T> = T extends { content: (infer U)[] | undefined } ? U : never

type PageContentBlock = NonNullable<PageComponent['content']>[number]

/**
 * Union of all generated Storyblok block types, including nested-only types
 * like AccordionItemComponent that don't appear directly in PageComponent.content.
 */
export type StoryblokBlock = PageContentBlock | NestedBlock<PageContentBlock>

/** Union of all root-level Storyblok page content types. */
export type StoryblokPageContent = PageComponent | ProductListingPageComponent

/**
 * Storyblok story response typed with the generated page schema.
 * Accepts both regular pages and product listing pages so that server
 * services can return a single `CMSPageData` shape for all routes.
 */
export type StoryblokStory = ISbStoryData<StoryblokPageContent>

/**
 * Storyblok page payload passed from server to client via Inertia props.
 *
 * Carries no `[key: string]: unknown` index signature: an object with an
 * unexpected key fails to compile instead of slipping through as `unknown`.
 * Provider-agnostic files import this shape through the `@cms-shared` alias,
 * which Vite points at the selected `CMS_PROVIDER`.
 */
export interface CMSPageData {
  story: StoryblokStory
}
