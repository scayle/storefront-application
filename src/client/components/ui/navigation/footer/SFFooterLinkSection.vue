<template>
  <div class="flex flex-col gap-5" data-testid="footer-link-section">
    <!-- eslint-disable-next-line vuejs-accessibility/heading-has-content -- The `SFNavigationTreeItem` inside the button renders the section title. -->
    <h2 class="heading-section-2 lg:text-sm">
      <button
        type="button"
        class="flex w-full items-center lg:hidden"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        data-testid="footer-link-section-title"
        @click="expanded = !expanded"
      >
        <SFNavigationTreeItem :navigation-item="section" disabled-link />
        <span class="ml-auto flex">
          <IconIncrementPlus v-if="!expanded" class="size-4" />
          <IconIncrementMinus v-else class="size-4" />
        </span>
      </button>
      <span class="hidden lg:flex">
        <SFNavigationTreeItem :navigation-item="section" disabled-link />
      </span>
    </h2>
    <ul
      :id="panelId"
      ref="content"
      class="flex-col gap-x-2 gap-y-5 transition-all lg:flex"
      :class="{
        flex: expanded,
        hidden: !expanded,
      }"
    >
      <li v-for="item in section.children" :key="item.id">
        <SFNavigationTreeItem :navigation-item="item" />
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import type { NavigationItem } from '@scayle/storefront/types'
import IconIncrementMinus from '@assets/icons/increment/minus.svg'
import IconIncrementPlus from '@assets/icons/increment/plus.svg'
import { ref, useId } from 'vue'
import { useRouterEvent } from '@client/composables/useRouterEvent'
import SFNavigationTreeItem from '../SFNavigationTreeItem.vue'

const { section } = defineProps<{
  section: NavigationItem
}>()

const expanded = ref(false)
const panelId = `footer-link-section-${useId().replace(/:/g, '')}`

// Reset `expanded` if current route is left
useRouterEvent('navigate', () => {
  expanded.value = false
})
</script>
