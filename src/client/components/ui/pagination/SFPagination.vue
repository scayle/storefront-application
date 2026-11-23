<template>
  <nav
    class="flex flex-row justify-center"
    :aria-label="ariaLabel ?? $t('pagination.a11y.label')"
  >
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- Delegated arrow-key handler for the focusable pagination links inside. -->
    <div
      ref="controlsRef"
      class="mx-4 flex h-14 max-w-full flex-row items-center justify-between gap-1 rounded-md border border-gray-200 lg:w-min lg:gap-2"
      aria-keyshortcuts="ArrowLeft ArrowRight Home End"
      @keydown="onKeydown"
    >
      <slot
        :has-previous-page="pagination.hasPreviousPage"
        :previous-page="previousPage"
        name="previous-button"
      >
        <SFPaginationLink
          v-if="previousPage && navigateBy === 'link'"
          :disabled="!pagination.hasPreviousPage"
          :page="previousPage"
          test-id="paginationLink-previousPage"
          class="group"
          :aria-label="$t('pagination.a11y.go_to_previous_page')"
          @click="emit('pageChange', previousPage.number)"
        >
          <IconNavigationLeft
            class="size-4 fill-secondary group-hover:not-disabled:fill-primary"
          />
        </SFPaginationLink>
        <SFPaginationButton
          v-else-if="previousPage"
          :disabled="!pagination.hasPreviousPage"
          :page="previousPage"
          test-id="paginationButton-previousPage"
          class="group"
          :aria-label="$t('pagination.a11y.go_to_previous_page')"
          @select="(n) => emit('pageChange', n)"
        >
          <IconNavigationLeft
            class="size-4 fill-secondary group-hover:not-disabled:fill-primary"
          />
        </SFPaginationButton>
      </slot>

      <slot name="first-page" :first-page="firstPage">
        <SFPaginationLink
          v-if="
            firstPage &&
            pagination.showFirstAndLastButtons &&
            navigateBy === 'link'
          "
          :page="firstPage"
          :aria-label="$t('pagination.a11y.go_to_page', { page: 1 })"
          @click="emit('pageChange', firstPage.number)"
        />
        <SFPaginationButton
          v-else-if="firstPage && pagination.showFirstAndLastButtons"
          :page="firstPage"
          :aria-label="$t('pagination.a11y.go_to_page', { page: 1 })"
          @select="(n) => emit('pageChange', n)"
        />
      </slot>

      <slot name="leading-ellipsis">
        <div
          v-if="pagination.hasLeadingEllipsis"
          class="inline-flex h-full items-center border-t-2 border-transparent text-sm leading-none font-bold text-secondary"
          aria-hidden="true"
        >
          ...
        </div>
      </slot>

      <slot name="page-buttons" :visible-pages="visiblePages">
        <template v-for="page in visiblePages" :key="page.number">
          <SFPaginationLink
            v-if="navigateBy === 'link'"
            :page="page"
            :aria-label="
              $t('pagination.a11y.go_to_page', { page: page.number })
            "
            @click="emit('pageChange', page.number)"
          />
          <SFPaginationButton
            v-else
            :page="page"
            :aria-label="
              $t('pagination.a11y.go_to_page', { page: page.number })
            "
            @select="(n) => emit('pageChange', n)"
          />
        </template>
      </slot>

      <slot name="trailing-ellipsis">
        <div
          v-if="pagination.hasTrailingEllipsis"
          class="inline-flex h-full items-center border-t-2 border-transparent text-sm leading-none font-bold text-secondary"
          aria-hidden="true"
        >
          ...
        </div>
      </slot>

      <slot name="last-page" :last-page="lastPage">
        <SFPaginationLink
          v-if="
            lastPage &&
            pagination.showFirstAndLastButtons &&
            navigateBy === 'link'
          "
          :page="lastPage"
          :aria-label="
            $t('pagination.a11y.go_to_page', { page: lastPage.number })
          "
          @click="emit('pageChange', lastPage.number)"
        />
        <SFPaginationButton
          v-else-if="lastPage && pagination.showFirstAndLastButtons"
          :page="lastPage"
          :aria-label="
            $t('pagination.a11y.go_to_page', { page: lastPage.number })
          "
          @select="(n) => emit('pageChange', n)"
        />
      </slot>

      <slot
        name="next-button"
        :has-next-page="pagination.hasNextPage"
        :next-page="nextPage"
      >
        <SFPaginationLink
          v-if="nextPage && navigateBy === 'link'"
          :disabled="!pagination.hasNextPage"
          :page="nextPage"
          test-id="paginationLink-nextPage"
          class="group"
          :aria-label="$t('pagination.a11y.go_to_next_page')"
          @click="emit('pageChange', nextPage.number)"
        >
          <IconNavigationRight
            class="size-4 fill-secondary group-hover:not-disabled:fill-primary"
          />
        </SFPaginationLink>
        <SFPaginationButton
          v-else-if="nextPage"
          :disabled="!pagination.hasNextPage"
          :page="nextPage"
          test-id="paginationButton-nextPage"
          class="group"
          :aria-label="$t('pagination.a11y.go_to_next_page')"
          @select="(n) => emit('pageChange', n)"
        >
          <IconNavigationRight
            class="size-4 fill-secondary group-hover:not-disabled:fill-primary"
          />
        </SFPaginationButton>
      </slot>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import IconNavigationRight from '@assets/icons/navigation/right.svg'
import { useRoute } from '@client/composables/useRoute'
import { useKeydownActions } from '@client/composables/useKeydownActions'
import type { Pagination, PaginationPageToken } from '@scayle/storefront/types'
import type { Page } from '@client/types'
import SFPaginationButton from './SFPaginationButton.vue'
import SFPaginationLink from './SFPaginationLink.vue'

const props = withDefaults(
  defineProps<{
    /** Server pagination from page props. */
    pagination: Pagination
    /** Render mode: 'link' uses Inertia Links for server navigation, 'button' uses native buttons. */
    navigateBy?: 'link' | 'button'
    /**
     * Accessible name for the `<nav>` landmark. Defaults to `pagination.a11y.label`.
     */
    ariaLabel?: string
  }>(),
  { navigateBy: 'link' },
)

const emit = defineEmits<{
  /** Emitted in button mode when a page button is clicked. */
  pageChange: [pageNumber: number]
  resetFocus: []
}>()

const { path, query } = useRoute()

function buildPageUrl(pageNumber: number): string {
  const newQuery = new URLSearchParams(query.value)

  if (pageNumber === 1) {
    newQuery.delete('page')
  } else {
    newQuery.set('page', pageNumber.toString())
  }

  const queryString = newQuery.toString()

  return queryString ? `${path.value}?${queryString}` : path.value
}

function toPage(token: PaginationPageToken): Page {
  return {
    number: token.page,
    to: buildPageUrl(token.page),
    isActive: token.isActive,
  }
}

const visiblePages = computed(() => props.pagination.visiblePages.map(toPage))

const previousPage = computed(() => toPage(props.pagination.previousPage))
const nextPage = computed(() => toPage(props.pagination.nextPage))
const firstPage = computed(() => toPage(props.pagination.firstPage))
const lastPage = computed(() => toPage(props.pagination.lastPage))

const controlsRef = useTemplateRef<HTMLDivElement>('controlsRef')

const FOCUSABLE_CONTROL_SELECTOR =
  'a:not([aria-disabled="true"]), button:not([aria-disabled="true"])'

function getFocusableControls(): HTMLElement[] {
  const container = controlsRef.value
  if (!container) {
    return []
  }

  return [
    ...container.querySelectorAll<HTMLElement>(FOCUSABLE_CONTROL_SELECTOR),
  ]
}

function focusControlAt(index: number) {
  const controls = getFocusableControls()
  if (controls.length === 0) {
    return
  }

  const clampedIndex = Math.max(0, Math.min(index, controls.length - 1))
  controls[clampedIndex]?.focus()
}

function focusAdjacent(delta: number) {
  const controls = getFocusableControls()
  const currentIndex = controls.findIndex(
    (control) => control === document.activeElement,
  )

  if (currentIndex === -1) {
    return
  }

  focusControlAt(currentIndex + delta)
}

const onKeydown = useKeydownActions(
  {
    left: (e) => {
      focusAdjacent(-1)
      e.preventDefault()
    },
    right: (e) => {
      focusAdjacent(1)
      e.preventDefault()
    },
    home: (e) => {
      focusControlAt(0)
      e.preventDefault()
    },
    end: (e) => {
      focusControlAt(getFocusableControls().length - 1)
      e.preventDefault()
    },
    enter: () => {
      emit('resetFocus')
    },
  },
  { preventDefault: false },
)

defineSlots<{
  /** Custom previous button with navigation state */
  'previous-button': (props: {
    hasPreviousPage: boolean
    previousPage: Page | undefined
  }) => unknown
  /** Custom first page button */
  'first-page': (props: { firstPage: Page | undefined }) => unknown
  /** Custom leading ellipsis indicator */
  'leading-ellipsis': () => unknown
  /** Custom page buttons */
  'page-buttons': (props: { visiblePages: Page[] }) => unknown
  /** Custom trailing ellipsis indicator */
  'trailing-ellipsis': () => unknown
  /** Custom last page button */
  'last-page': (props: { lastPage: Page | undefined }) => unknown
  /** Custom next button with navigation state */
  'next-button': (props: {
    hasNextPage: boolean
    nextPage: Page | undefined
  }) => unknown
}>()
</script>
