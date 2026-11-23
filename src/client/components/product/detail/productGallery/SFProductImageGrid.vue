<template>
  <!--
    Six columns is the least common multiple of the row sizes we use (rows of
    1, 2, or 3 tiles). Only a track divisible by 1, 2, AND 3 lets every row
    split into equal, whole-column tiles with no leftover fraction: a 1-tile row
    spans all 6, a 2-tile row 3 each, a 3-tile row 2 each. `buildGalleryTileRowSizes()`
    lists how wide each tile's row is; `spanClasses` and `tilePresets` map that
    to `col-span-*` and image presets per tile. Fewer columns (e.g. 2 or 3)
    could not host all three row sizes.

    `role="list"` is set explicitly because Tailwind's preflight applies
    `list-style: none`, which makes Safari/VoiceOver drop the list role (and the
    "N images" count with it). The label names the whole gallery as one group.
  -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-redundant-roles -- Safari/VoiceOver drop the implicit list role under `list-style: none`, see above. -->
  <ul
    class="grid grid-cols-6 gap-2"
    role="list"
    :aria-label="$t('product_image.a11y.grid_label', { name: productName })"
    data-testid="product-image-grid"
  >
    <li
      v-for="(item, index) in items"
      :key="item.url"
      class="min-w-0"
      :class="spanClasses[index]"
    >
      <SFProductVideoSlide
        v-if="item.type === 'video'"
        :url="item.url"
        :poster-url="item.posterUrl"
        :alt="
          $t('product_video.a11y.slide_label', {
            name: productName,
            index: index + 1,
            total: items.length,
          })
        "
        :is-playing="index === playingVideoIndex"
        :data-testid="`product-grid-tile-${index}`"
        @play="$emit('playVideo', index)"
      />
      <!--
        No `focus-style-inset` here (unlike the old rail, whose button was itself
        `overflow-hidden`): the image frame is a descendant, not an ancestor, so
        an inset ring is painted over by the edge-to-edge image. The global
        `*:focus-visible` outward ring sits outside the button and stays visible;
        `rounded-md` matches the image frame so the ring hugs the same corners.
      -->
      <button
        v-else
        type="button"
        class="block w-full cursor-zoom-in rounded-md"
        :aria-label="
          $t('product_image.a11y.enlarge_image', {
            index: index + 1,
            total: items.length,
          })
        "
        :data-testid="`product-grid-tile-${index}`"
        @click="$emit('enlarge', index)"
      >
        <SFProductImage
          :url="item.url"
          :preset="tilePresets[index]"
          :alt="
            $t('product_image.alt_with_image_index', {
              alt: productName,
              index: index + 1,
              total: items.length,
            })
          "
          :apply-padding="item.applyPadding"
          :image-loading="index === 0 ? 'eager' : 'lazy'"
          :fetch-priority="index === 0 ? 'high' : 'auto'"
        />
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductVideoSlide from '@client/components/product/detail/productGallery/SFProductVideoSlide.vue'
import {
  buildGalleryTileRowSizes,
  galleryImagePresetForRowSize,
} from '@shared/utils/productGalleryMedia'
import type {
  ProductGalleryItem,
  ProductGalleryRowSize,
} from '@shared/utils/productGalleryMedia'

const { items } = defineProps<{
  /** Ordered gallery items (images and videos). Image tiles open the zoom. */
  items: ProductGalleryItem[]
  /** Product name, for the container label and per-tile alt text. */
  productName: string
  /** Gallery index of the one video currently allowed to play, if any. */
  playingVideoIndex?: number
}>()

defineEmits<{
  /** Enlarge (open the zoom) at the given media index. */
  enlarge: [index: number]
  /** Make the video at this media index the active playing video. */
  playVideo: [index: number]
}>()

// Row size -> the column span that fills the row on the 6-column track (see the
// six-columns rationale above the template's `<ul>`). Every row sums to 6, so
// the default `grid-auto-flow: row` wraps each row on its own without gaps.
const SPAN_CLASS: Record<ProductGalleryRowSize, string> = {
  1: 'col-span-6', // 1 tile  -> full width
  2: 'col-span-3', // 2 tiles -> half each
  3: 'col-span-2', // 3 tiles -> a third each
}

/** Per-tile row width (1, 2, or 3 tiles in the row), shared by span and preset. */
const tileRowSizes = computed(() => buildGalleryTileRowSizes(items.length))

/** Per-tile column-span class, derived from the row partition. */
const spanClasses = computed(() =>
  tileRowSizes.value.map((rowSize) => SPAN_CLASS[rowSize]),
)

/** Per-tile image preset, sized for the same row partition as the spans. */
const tilePresets = computed(() =>
  tileRowSizes.value.map(galleryImagePresetForRowSize),
)
</script>
