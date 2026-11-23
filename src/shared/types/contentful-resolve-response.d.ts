declare module 'contentful-resolve-response' {
  import type { EntryCollection, EntrySkeletonType } from 'contentful'

  /**
   * Resolves Contentful links in a raw Content Delivery/Preview API response by
   * inlining linked entries and assets from the `includes` collection.
   *
   * Used to render untransformed Contentful Live Preview data: the entry is
   * fetched and subscribed in its raw (`WITHOUT_LINK_RESOLUTION`) shape, then
   * resolved here before rendering. `options.removeUnresolved` drops
   * unresolvable links instead of keeping them as link objects (default false).
   *
   * @returns Array of resolved items in the same order as `response.items`
   */
  export default function resolveResponse<T = unknown>(
    response: {
      items: unknown[]
      includes: EntryCollection<EntrySkeletonType>['includes']
    },
    options?: { removeUnresolved?: boolean; itemEntryPoints?: string[] },
  ): T[]
}
