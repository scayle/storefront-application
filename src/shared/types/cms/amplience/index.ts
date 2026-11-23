import type {
  AccordionItemComponent,
  PageComponent,
  ProductListingPageComponent,
} from './gen'

export type * from './gen'

/**
 * Union of every Amplience content-array entry.
 *
 * Amplience wraps each block in a discriminated envelope rather than inlining
 * the block's own fields: an entry carries `componentType: 'text'` alongside a
 * `text` key holding the `TextComponent` payload. The dispatcher narrows on
 * `componentType` and then renders the matching key, so this union is over the
 * envelopes, not the payload types.
 *
 * Derived from `PageComponent.components` so it stays in sync with the
 * generated schema. `AccordionItemComponent` is added separately because
 * accordion children are stored as bare payloads with no envelope, which is why
 * it is not reachable from any content array.
 */
export type AmplienceBlock = NonNullable<PageComponent['components']>[number]

/**
 * Accordion children, which Amplience stores as bare `AccordionItemComponent`
 * payloads rather than discriminated envelopes.
 */
export type AmplienceAccordionItem = AccordionItemComponent

/** Union of all root-level Amplience page content types. */
export type AmpliencePageContent = PageComponent | ProductListingPageComponent

/**
 * Amplience page payload passed from server to client via Inertia props.
 *
 * Unlike Storyblok's `{ story }` envelope, the Amplience delivery SDK returns
 * the content item itself, so the payload is the page content with `_meta` at
 * the top level. The alias exists to give every provider the same
 * `CMSPageData` name; it does not tighten checking here, because the generated
 * `PageComponent` and `ProductListingPageComponent` each carry their own
 * `[k: string]: unknown` index signature, so excess keys still compile. Making
 * them a compile error would need `additionalProperties: false` in the JSON
 * schemas that feed `pnpm cms:sync`.
 * Provider-agnostic files import this shape through the `@cms-shared` alias,
 * which Vite points at the selected `CMS_PROVIDER`.
 */
// eslint-disable-next-line sonarjs/redundant-type-aliases -- every provider's types module exports the payload under the same `CMSPageData` name so `@cms-shared` resolves uniformly
export type CMSPageData = AmpliencePageContent
