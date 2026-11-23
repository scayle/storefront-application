import { inject, provide } from 'vue'
import type { ImageLoading } from '@client/constants'

const LCP_PRIORITY_KEY = Symbol('cms.lcpPriority')

/** Native `<img fetchpriority>` values, mirroring `SFProductImageBase`. */
export type FetchPriority = 'high' | 'low' | 'auto'

/** Native `<img loading>` values, shared with the product image components. */
export type { ImageLoading }

/** Per-image overrides for the automatic LCP priority. */
export interface ImagePriorityOverrides {
  /** Overrides the automatic `fetchpriority`. */
  fetchPriority?: FetchPriority
  /** Overrides the automatic `loading` hint. */
  loading?: ImageLoading
}

/**
 * Number of leading CMS images (in document order) that load eagerly when no
 * explicit `loading` override is set. It is separate from the `eagerLoadingCount`
 * of `SFImageGallery` and `SFImageStrip`, which defaults to 1.
 *
 * `fetchpriority="high"` still goes to the single first image only — this count
 * governs `loading` alone, so visible images that follow the hero (e.g. the top
 * row of an above-the-fold grid) are not forced `lazy`, which would delay their
 * fetch and slow the real LCP element when it is one of them.
 *
 * It is a viewport-blind heuristic: the claim resolves on the server with no
 * fold information, so this is a deliberately small default rather than a
 * precise above-the-fold count.
 */
export const CMS_EAGER_LOADING_COUNT = 3

/**
 * Resolves the effective `fetchpriority` and `loading` of a CMS image: an
 * explicit override always wins, otherwise the image's LCP claim index decides.
 *
 * The two hints are resolved independently. `fetchpriority="high"` goes to the
 * single first image (index `0`) — the likely LCP element — while `loading`
 * follows document position: the first `CMS_EAGER_LOADING_COUNT` images load `eager`,
 * the rest `lazy`. Decoupling them stops a visible non-first image (a grid cell
 * next to the hero) from being lazy-loaded, which would slow it down.
 *
 * Shared by every provider's `ImageComponent` and `SectionComponent` so the
 * resolution stays identical across providers. The `claim()` call itself stays
 * at the call site because it differs per component (an image always claims, a
 * section only claims when it has a background image).
 *
 * @param lcpIndex The image's 0-based claim index, or `-1` when it did not claim
 * (rendered outside a CMS page, or a section without a background image).
 * @param overrides Explicit per-component `fetchPriority` / `loading` props.
 * @returns The attributes to bind on the rendered `<img>`.
 */
export function resolveImagePriority(
  lcpIndex: number,
  overrides: ImagePriorityOverrides,
): { fetchPriority: FetchPriority; loading: ImageLoading } {
  return {
    fetchPriority:
      overrides.fetchPriority ?? (lcpIndex === 0 ? 'high' : 'auto'),
    loading:
      overrides.loading ??
      (lcpIndex >= 0 && lcpIndex < CMS_EAGER_LOADING_COUNT ? 'eager' : 'lazy'),
  }
}

/**
 * Per-page claim assigning each CMS image its document-order position.
 * Exposed by {@link useLcpPriority} so the first CMS image can opt into
 * `fetchpriority="high"` while `loading` follows the image's position.
 */
export interface LcpPriorityClaim {
  /**
   * Claims the next document-order position for the calling image.
   *
   * @returns The caller's 0-based index within the page (`0` for the first
   * image, `1` for the next, and so on). Returns `-1` when no page provided a
   * claim (e.g. an image rendered outside a CMS page).
   */
  claim: () => number
}

/**
 * Provides a fresh LCP priority claim for the current CMS page. Call this in a
 * provider's `PageComponent` so each image rendered in document order, across
 * arbitrarily nested containers (Section, Grid, Slider), receives its position
 * and the first one can mark itself as the LCP candidate.
 *
 * Vue renders depth-first in document order on both the server and during
 * hydration, so the images run their setup in the same order on both sides,
 * keeping indices stable and avoiding a hydration mismatch.
 *
 * @example
 * ```ts
 * // In ContentfulPageComponent.vue <script setup>
 * provideLcpPriority()
 * ```
 *
 * @see https://vuejs.org/guide/components/provide-inject.html
 */
export function provideLcpPriority(): void {
  let nextIndex = 0
  provide<LcpPriorityClaim>(LCP_PRIORITY_KEY, {
    claim() {
      return nextIndex++
    },
  })
}

/**
 * Reads the page's LCP priority claim provided by {@link provideLcpPriority}.
 * Used by CMS image components to decide their default `fetchpriority` and
 * `loading` when no explicit override is set.
 *
 * @returns The claim for the current page. When no page provided one (e.g. an
 * image rendered outside a CMS page), the claim always resolves to `-1`.
 *
 * @example
 * ```ts
 * const lcpIndex = useLcpPriority().claim()
 * ```
 */
export function useLcpPriority(): LcpPriorityClaim {
  return inject<LcpPriorityClaim>(LCP_PRIORITY_KEY, { claim: () => -1 })
}
