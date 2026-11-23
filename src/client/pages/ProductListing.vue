<template>
  <ProductPageMetaHead :meta="meta" :hreflangs="hreflangs" :json-ld="jsonLd" />
  <div class="flex flex-col">
    <ProductListingPageComponent
      v-if="cmsContent"
      :data="cmsContent"
      content-type="teaser"
    />
    <div class="relative container flex bg-white pt-4">
      <div class="sticky top-8 mr-2 h-full min-w-40 max-lg:hidden lg:min-w-64">
        <SFCategoryTreeNavigation
          v-if="treeNavigationCategories.length"
          class="sticky top-8 h-full min-w-40 max-lg:hidden lg:min-w-64"
          :categories="treeNavigationCategories"
        />
      </div>

      <div class="w-full grow">
        <SFCategoryBreadcrumbs
          v-if="category.depth > 1"
          :category="category"
          class="my-4 hidden lg:block"
        />

        <div class="flex flex-wrap items-end justify-between gap-5">
          <div class="flex min-w-0 items-center gap-2">
            <SFBackButton
              :to="categoryBackLink"
              class="-ml-3 lg:hidden"
              data-testid="plp-back-button"
            />
            <SFCategoryHeadline
              v-if="category"
              :category="category"
              :products-count="pagination.totalItems"
            />
          </div>
          <div class="hidden gap-4 lg:flex">
            <SFListingImageViewSelection :options="imageViewOptions" />
            <SFSortSelection
              class="max-sm:hidden"
              :selected-sort="sorting.selected"
              :sort-options="sorting.options"
            />
            <SFFilterToggleButton
              :label="$t('filter.show_filter')"
              :applied-filters-count="appliedFilters.count"
              v-bind="filterTriggerAttrs"
              @toggle="toggleFilter"
            />
          </div>
        </div>

        <div class="mt-2.5 mb-3.5 min-h-12 lg:hidden">
          <SFCategoryListNavigation
            v-if="listNavigationCategories.length"
            :categories="listNavigationCategories"
          />
        </div>

        <SFFilterToggleButton
          class="lg:hidden"
          :label="$t('filter.show_filter_and_sorting')"
          :applied-filters-count="appliedFilters.count"
          v-bind="filterTriggerAttrs"
          @toggle="toggleFilter"
        />

        <SFProductGrid
          :category="category"
          class="mt-6"
          :products="products"
          :pagination="pagination"
          :applied-filters="appliedFilters"
          product-list-type="category"
          :product-list-id="category.id.toString()"
          :image-type="selectedImageType"
        />

        <div
          v-if="isFirstPage && cmsContent"
          class="mt-3 border-t border-gray-200 pt-3"
        >
          <ProductListingPageComponent :data="cmsContent" content-type="seo" />
        </div>
      </div>
    </div>
    <ClientOnly>
      <Teleport to="#teleports">
        <div class="fixed right-4 bottom-8 lg:bottom-24">
          <SFScrollToTopButton />
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-listing-page
import { computed } from 'vue'
import type {
  Category,
  CategoryListNavigationItem,
  CategoryTreeNavigationNode,
  Hreflang,
  ResolvedSorting,
  Filter,
  AppliedFilters,
  Pagination,
  ListingProduct,
} from '@scayle/storefront/types'
import type { ProductListingPageJsonLd, SEOMeta } from '@shared/types/SEO'
import SFProductGrid from '@client/components/product/SFProductGrid.vue'
import SFCategoryTreeNavigation from '@client/components/category/SFCategoryTreeNavigation.vue'
import SFCategoryListNavigation from '@client/components/category/SFCategoryListNavigation.vue'
import SFCategoryBreadcrumbs from '@client/components/category/SFCategoryBreadcrumbs.vue'
import SFCategoryHeadline from '@client/components/category/SFCategoryHeadline.vue'
import SFBackButton from '@client/components/ui/navigation/SFBackButton.vue'
import SFFilterToggleButton from '@client/components/filter/SFFilterToggleButton.vue'
import SFSortSelection from '@client/components/sorting/SFSortSelection.vue'
import SFListingImageViewSelection from '@client/components/image-view/SFListingImageViewSelection.vue'
import { useImageView } from '@client/composables/useImageView'
import type { ImageViewOption } from '@shared/types/ImageView'
import { useOverlay } from '@client/composables/useOverlay'
import SFScrollToTopButton from '@client/components/SFScrollToTopButton.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import ProductPageMetaHead from '@client/components/meta/PageMetaHead.vue'
import ProductListingPageComponent from '@cms-client/components/ProductListingPageComponent.vue'
import type { CMSPageData } from '@cms-shared'
import { routes } from '@shared/routes'

const props = defineProps<{
  products: ListingProduct[]
  pagination: Pagination
  category: Category
  meta: SEOMeta
  listNavigationCategories: CategoryListNavigationItem[]
  treeNavigationCategories: CategoryTreeNavigationNode[]
  hreflangs?: Hreflang[]
  /** Server-only: present on the server-rendered page, absent after a client-side navigation. */
  jsonLd?: ProductListingPageJsonLd
  sorting: ResolvedSorting
  appliedFilters: AppliedFilters
  filters?: Filter[]
  cmsContent?: CMSPageData | null
  /** Image views the shop offers. Empty when it offers none, which hides the selector. */
  imageViewOptions: ImageViewOption[]
}>()

const isFirstPage = computed(() => props.pagination.currentPage === 1)

const { selectedImageType } = useImageView(() => props.imageViewOptions)

// Mobile back button targets the parent category (last breadcrumb), falling
// back to the home route for top-level categories without a parent.
const categoryBackLink = computed(
  () => props.category.breadcrumbs.at(-1)?.to ?? routes.home,
)

const { triggerAttrs: filterTriggerAttrs, toggle: toggleFilter } =
  useOverlay().create(
    () => import('@client/components/filter/SFFilterSlideIn.vue'),
    {
      props: () => ({
        selectedSort: props.sorting.selected,
        sortOptions: props.sorting.options,
        imageViewOptions: props.imageViewOptions,
        appliedFilter: props.appliedFilters,
        filters: props.filters,
        filteredProductCount: props.pagination.totalItems,
        productListType: 'category' as const,
        productListId: props.category.id.toString(),
      }),
    },
  )
</script>
