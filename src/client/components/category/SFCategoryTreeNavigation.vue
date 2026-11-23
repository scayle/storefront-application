<template>
  <!-- A `div`, not an `aside`: the named `nav` is the landmark, a second unnamed one around it only adds noise. -->
  <div class="mt-4 h-dvh">
    <nav :aria-label="$t('navigation.a11y.category_navigation')" class="h-full">
      <ul
        class="-ml-1 scrollbar-hide h-full overflow-y-scroll py-1 pl-1"
        data-testid="side-navigation"
      >
        <li
          v-for="(rootNode, index) in categories"
          :key="`category-navigation-tree-item-${rootNode.path}`"
          :data-testid="`root-category-${index}`"
          class="mt-2 mb-5 first:mt-0 last:mb-0"
        >
          <SFCategoryTreeNavigationNode :node="rootNode" />
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { CategoryTreeNavigationNode } from '@scayle/storefront/types'
import SFCategoryTreeNavigationNode from './SFCategoryTreeNavigationNode.vue'

defineProps<{
  /** Array of root-level tree nodes for the sidebar navigation */
  categories: CategoryTreeNavigationNode[]
}>()
</script>
