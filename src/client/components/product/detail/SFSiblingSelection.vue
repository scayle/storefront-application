<template>
  <div class="min-w-0" data-testid="sibling-selection">
    <SFItemSlider
      with-arrows
      mode="horizontal"
      data-testid="product-thumbnails"
      :slider-tabindex="areAllSoldOut ? 0 : -1"
      :slider-label="areAllSoldOut ? $t('product_attribute.color') : undefined"
    >
      <template #header>
        <div class="mb-3 flex justify-between">
          <SFLabelValue
            :id="labelId"
            :label="$t('product_attribute.color')"
            :value="labelValue"
            size="large"
          />
        </div>
      </template>
      <!--
        Sibling swatches are links to other PDPs, not in-place radio options.
        Arrow keys move focus only. The loaded variant uses aria-current="page",
        not aria-checked tied to focus (that would mislead SR users).
      -->
      <nav
        class="ml-1 flex w-full gap-2 py-1.5"
        data-testid="sibling-link-group"
        :aria-labelledby="labelId"
      >
        <SFLink
          v-for="(sibling, index) in siblings"
          :key="sibling.id"
          raw
          class="relative shrink-0 place-content-center rounded-xl"
          data-testid="product-sibling-link"
          :data-sibling-index="index"
          :to="sibling.link"
          :disabled="sibling.isSoldOut"
          :aria-current="sibling.id === product.id ? 'page' : undefined"
          @click="onSiblingClick($event, sibling)"
          @mouseenter="setHoveredLabel(sibling)"
          @mouseleave="setHoveredLabel()"
          @focus="setHoveredLabel(sibling)"
          @blur="setHoveredLabel()"
        >
          <!--
            Eager: in the initial viewport on desktop, and on mobile close
            enough below the fold that browsers fetch it anyway.
          -->
          <SFProductThumbnail
            v-if="sibling.image"
            thumbnail-size="lg"
            image-loading="eager"
            :selected="sibling.id === product.id"
            :disabled="sibling.isSoldOut"
            :alt="siblingAltText(sibling)"
            data-testid="product-sibling-image"
            :url="sibling.image.url"
            preset="thumbnail"
            :apply-padding="sibling.image.applyPadding"
          />
        </SFLink>
      </nav>
      <template
        #arrows="{ isPrevEnabled, isNextEnabled, prev, next, isScrollable }"
      >
        <div
          class="absolute top-0 right-0 flex gap-0.5 max-lg:hidden"
          :class="{ hidden: !isScrollable }"
        >
          <SFButton
            type="button"
            variant="secondary"
            size="sm"
            rounded-left
            class="size-6! first:p-0.5!"
            :disabled="!isPrevEnabled"
            :aria-label="$t('sibling_selection.a11y.previous_color')"
            @click="prev()"
          >
            <template #prepend-icon>
              <IconNavigationLeft class="size-2! fill-secondary" />
            </template>
          </SFButton>
          <SFButton
            type="button"
            variant="secondary"
            size="sm"
            rounded-right
            class="size-6! last:p-0.5!"
            :aria-label="$t('sibling_selection.a11y.next_color')"
            :disabled="!isNextEnabled"
            @click="next()"
          >
            <template #prepend-icon>
              <IconNavigationRight class="size-2! fill-secondary" />
            </template>
          </SFButton>
        </div>
      </template>
    </SFItemSlider>
  </div>
</template>

<script setup lang="ts">
import type { ProductSibling, DetailedProduct } from '@scayle/storefront/types'
import { computed, ref, useId } from 'vue'
import SFProductThumbnail from '@client/components/product/SFProductThumbnail.vue'
import SFItemSlider from '@client/components/ui/core/SFItemSlider.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import IconNavigationRight from '@assets/icons/navigation/right.svg'
import { useI18n } from 'vue-i18n'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'

const { product } = defineProps<{
  /**
   * Product object containing siblings array with different color variants of the same product.
   */
  product: DetailedProduct
}>()

const { t } = useI18n()

// `product.siblings` carries only the other color variants. The product itself
// satisfies `ProductSibling`, so prepend it directly — it leads the row and is
// highlighted as the loaded variant.
const siblings = computed<ProductSibling[]>(() => [
  // `ProductSibling` carries a single `image`, which the product itself does
  // not have — it ships the full `images` array instead.
  { ...product, image: product.images.at(0) },
  ...product.siblings,
])

// A sold-out swatch is a disabled link and leaves the tab order. With every
// swatch sold out, the scroller is the only thing left to reach by keyboard.
const areAllSoldOut = computed(() =>
  siblings.value.every((sibling) => sibling.isSoldOut),
)

const labelId = useId()

const hoveredColorLabel = ref<string | undefined>()

const setHoveredLabel = (sibling?: ProductSibling) => {
  if (!sibling) {
    hoveredColorLabel.value = undefined
    return
  }

  hoveredColorLabel.value =
    sibling.color?.toLowerCase() || t('sibling_selection.sibling_error')
}

const labelValue = computed(() => {
  return hoveredColorLabel.value || product.color?.toLowerCase()
})

const siblingAltText = (sibling: ProductSibling) => {
  const placeholder = {
    alt: t('product_image.alt', {
      productName: sibling.name,
      colors: sibling.color,
      brand: sibling.brand,
    }),
    selected:
      product.id === sibling.id
        ? t('sibling_selection.selected')
        : t('sibling_selection.unselected'),
  }
  return sibling.isSoldOut
    ? t('sibling_selection.a11y.sold_out_alt_text', placeholder)
    : t('sibling_selection.a11y.alt_text', placeholder)
}

const onSiblingClick = (event: MouseEvent, sibling: ProductSibling) => {
  if (sibling.id === product.id) {
    event.preventDefault()
  }
}
</script>
