<template>
  <div class="flex items-center">
    <SFBreadcrumb :items="items" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category } from '@scayle/storefront/types'
import SFBreadcrumb from '@client/components/ui/breadcrumb/SFBreadcrumb.vue'
import type { SFBreadcrumbItem } from '@client/components/ui/breadcrumb/SFBreadcrumb.vue'

const props = defineProps<{
  /** Currently selected category; its name and link are appended to the trail. */
  category: Category
}>()

const items = computed<SFBreadcrumbItem[]>(() => [
  ...props.category.breadcrumbs,
  { value: props.category.name, to: props.category.link },
])
</script>
