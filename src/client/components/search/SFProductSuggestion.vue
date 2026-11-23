<template>
  <SFSearchResultItem
    :id="`search-result-product-${suggestion.product.id}`"
    :to="suggestion.product.link"
    :active-id="activeId"
    class="group flex items-center space-x-4 p-1! pr-6!"
  >
    <div
      class="flex h-16 w-14 shrink-0 items-center overflow-hidden rounded-md bg-gray-200"
    >
      <SFProductImage
        v-if="thumbnail"
        :url="thumbnail.url"
        :preset="'thumbnail'"
        :alt="suggestion.product.name"
        image-loading="lazy"
        :apply-padding="thumbnail.applyPadding"
      />
    </div>
    <div class="grow overflow-hidden text-primary">
      <div class="truncate text-md font-semibold">
        {{ suggestion.product.brand }}
      </div>
      <div class="truncate text-md">
        {{ suggestion.product.name }}
      </div>
    </div>
    <SFProductPrice :price="suggestion.product.price" :inline="false" />
  </SFSearchResultItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SearchProductSuggestion } from '@scayle/storefront/types'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductPrice from '@client/components/product/SFProductPrice.vue'
import SFSearchResultItem from './SFSearchResultItem.vue'

const { suggestion } = defineProps<{
  /** Product search suggestion to display. */
  suggestion: SearchProductSuggestion
  /** Currently active suggestion ID from keyboard navigation. */
  activeId?: string
}>()

const thumbnail = computed(() => suggestion.product.images[0])
</script>
