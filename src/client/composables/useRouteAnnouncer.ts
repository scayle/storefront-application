import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePage } from '@client/composables/usePage'
import { usePageMeta } from './usePageMeta'
import { useAnnouncer } from './useAnnouncer'

/**
 * Announces Inertia route changes to screen readers.
 *
 * Inertia replaces page contents in place without a full document load, so the
 * browser only announces `document.title` on the initial visit; every
 * subsequent navigation is otherwise silent for AT users. This composable hooks
 * into the shared `usePageMeta` state populated by `PageMetaHead`: when a page's
 * `meta.title` changes, it announces a translated "Navigated to {title}".
 *
 * It is a thin wrapper over {@link useAnnouncer} — the announcement flows
 * through the single app-level assertive live region rather than a local one,
 * keeping a single source of truth. On the search results page the matched
 * product count is appended (e.g. "Navigated to … 69 results").
 *
 * The first non-empty title write (initial render) is skipped; the browser
 * announces that itself, and double-announcing on load would be noise. An empty
 * title, left behind by a page that renders no `PageMetaHead`, is skipped too.
 *
 * Call once near the app root (alongside `<SFLiveAnnouncer>`). No return value.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * useRouteAnnouncer()
 * </script>
 *
 * <template>
 *   <SFLiveAnnouncer />
 *   …
 * </template>
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/accessibility
 */
export function useRouteAnnouncer(): void {
  const { t } = useI18n()
  const page = usePage<'Search'>()
  const { currentTitle } = usePageMeta()
  const { announce } = useAnnouncer()
  let isInitial = true

  watch(currentTitle, (next) => {
    // Empty after a visit to a page that renders no `PageMetaHead`, which
    // leaves no title to announce.
    if (!next) {
      return
    }
    if (isInitial) {
      isInitial = false
      return
    }
    let message = t('a11y.navigated_to', { title: next })

    // On search, append the result count. `pagination` arrives in the same page
    // payload as the title, so it is available when the title changes. The
    // count is undefined for an empty search (no term), in which case only the
    // title is announced. A rejected term ran no search, so its zero count is
    // left out too, matching the hidden visible count.
    if (page.component === 'Search' && !page.props.termRejected) {
      const count = page.props.pagination?.totalItems
      if (typeof count === 'number') {
        message = `${message}. ${t('search_page.a11y.result_count', count)}`
      }
    }

    announce(message, { politeness: 'assertive' })
  })
}
