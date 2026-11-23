<template>
  <!-- Needs an `@container/product-card` ancestor (SFProductCard), or it stays at two swatches. -->
  <div
    class="flex items-center justify-start lg:bg-white/90 lg:p-3 lg:backdrop-blur-xs"
  >
    <SFLink
      v-for="(sibling, index) in siblingsToShow"
      :key="sibling.id"
      :to="sibling.link"
      raw
      class="relative mr-2 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-300"
      :class="{
        'hidden product-card-wide:block': index >= 2,
      }"
      data-testid="product-sibling"
    >
      <!--
        Current product and siblings render the `swatch` preset, whose 48px
        sizes already match this `size-12` swatch frame.
      -->
      <SFProductImage
        v-if="sibling.image"
        :url="sibling.image.url"
        preset="swatch"
        :alt="`${sibling.name} (${sibling.color})`"
        image-loading="lazy"
        :apply-padding="sibling.image.applyPadding"
        padding-size="compact"
        class="size-full object-cover"
      />
    </SFLink>
    <SFLink
      v-if="totalSwatchCount > VISIBLE_SWATCH_COUNT_COMPACT"
      :to="productLink"
      raw
      class="flex size-12 shrink-0 items-center justify-center text-sm font-semibold text-secondary product-card-wide:hidden"
    >
      + {{ totalSwatchCount - VISIBLE_SWATCH_COUNT_COMPACT }}
    </SFLink>
    <SFLink
      v-if="totalSwatchCount > VISIBLE_SWATCH_COUNT_WIDE"
      :to="productLink"
      raw
      class="hidden size-12 shrink-0 items-center justify-center text-sm font-semibold text-secondary product-card-wide:flex"
    >
      + {{ totalSwatchCount - VISIBLE_SWATCH_COUNT_WIDE }}
    </SFLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ListingProduct, ProductSibling } from '@scayle/storefront/types'
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'

const { siblings, productLink, product } = defineProps<{
  siblings: ProductSibling[]
  /** Link for the "+N more" overflow (current product PDP). */
  productLink: string
  product: ListingProduct
}>()

/** Swatch slots visible in a card narrower than 13.625rem: current product plus one sibling. */
const VISIBLE_SWATCH_COUNT_COMPACT = 2
/**
 * Swatch slots visible in a card at least 13.625rem (218px) wide: current product
 * plus two siblings. With three swatches a two-digit "+N" text ends at 218px, so a
 * narrower card, such as the basket slide-in grid, would clip it.
 */
const VISIBLE_SWATCH_COUNT_WIDE = 3

const nonSoldOutSiblings = computed(() => siblings.filter((s) => !s.isSoldOut))
const totalSwatchCount = computed(() => 1 + nonSoldOutSiblings.value.length)

const siblingsToShow = computed(() => [
  {
    id: product.id,
    link: product.link,
    name: product.name,
    color: product.color,
    image: product.images[0],
  },
  ...nonSoldOutSiblings.value.slice(0, 2).map((sibling) => ({
    id: sibling.id,
    link: sibling.link,
    name: sibling.name,
    color: sibling.color,
    image: sibling.image,
  })),
])
</script>
