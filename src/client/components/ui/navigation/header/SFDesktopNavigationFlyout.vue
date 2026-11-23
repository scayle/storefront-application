<template>
  <div
    v-if="item?.children?.length"
    class="min-h-80 border-t border-gray-300 bg-white py-10 drop-shadow-sm"
    data-testid="desktop-navigation-flyout"
  >
    <div class="container flex gap-x-14">
      <section
        v-for="columnItem in item.children"
        :key="columnItem.id"
        :aria-labelledby="headingId(columnItem.id)"
        class="flex flex-col space-y-2.5"
      >
        <h3 :id="headingId(columnItem.id)" class="mb-2.5 heading-section-3">
          <SFLink
            :to="columnItem.href"
            raw
            class="mr-3 block w-fit content-center rounded-sm p-1 text-lg/5 font-semibold text-(--textColor) transition-all hover:bg-gray-200 focus-visible:bg-gray-200"
          >
            {{ columnItem.name }}
          </SFLink>
        </h3>
        <ul
          v-if="columnItem.children.length > 0"
          class="grid w-fit grid-flow-col grid-rows-7 flex-col flex-wrap gap-x-5 gap-y-2.5"
        >
          <li v-for="rowItem in columnItem.children" :key="rowItem.id">
            <SFNavigationTreeItem
              :navigation-item="rowItem"
              @click="onItemClick(rowItem)"
            />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import type { NavigationItem } from '@scayle/storefront/types'
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFNavigationTreeItem from '../SFNavigationTreeItem.vue'

defineProps<{ item: NavigationItem }>()

const emit = defineEmits<{ close: [] }>()

const headingIdPrefix = `nav-flyout-col-${useId().replace(/:/g, '')}`
const headingId = (columnId: NavigationItem['id']) =>
  `${headingIdPrefix}-${columnId}`

const onItemClick = (item: NavigationItem) => {
  if (item.disabled) {
    return
  }
  emit('close')
}
</script>
