<template>
  <nav ref="navRef" :aria-label="$t('navigation.a11y.category_list')">
    <SFItemSlider fade class="scrollbar-hide w-full snap-x snap-mandatory">
      <SFLink
        v-for="category in categories"
        :key="category.path"
        :to="category.path"
        raw
        class="mr-2 w-fit rounded-full border-2 border-gray-200 bg-gray-200 px-4 py-3 text-md whitespace-pre text-secondary"
        :class="{
          'border-primary bg-white text-primary': category.isActive,
        }"
        :aria-current="category.isActive ? 'page' : undefined"
        @click="onItemClick"
      >
        {{ category.name }}
      </SFLink>
    </SFItemSlider>
  </nav>
</template>

<script setup lang="ts">
import type { CategoryListNavigationItem } from '@scayle/storefront/types'
import SFItemSlider from '@client/components/ui/core/SFItemSlider.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useScrollActiveIntoView } from '@client/composables/useScrollActiveIntoView'

defineProps<{
  /** Array of categories to display as horizontal navigation items */
  categories: CategoryListNavigationItem[]
}>()

const { navRef, onItemClick } = useScrollActiveIntoView()
</script>
