<template>
  <div data-testid="product-badges" class="flex flex-col gap-1">
    <SFProductBadge v-if="labels.length" :text="labels" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFProductBadge from '@client/components/product/SFProductBadge.vue'
import { useI18n } from 'vue-i18n'

/** Minimal product shape for badges (PLP card and PDP). */
export interface ProductBadgesProduct {
  isNew?: boolean
  storefrontBadge?: string
}

const { product } = defineProps<{ product: ProductBadgesProduct }>()

const { t } = useI18n()

const labels = computed(() => {
  return [
    product.isNew ? t('badge_labels.new') : null,
    product.storefrontBadge,
  ].filter((item): item is string => !!item)
})
</script>
