<template>
  <Suspense
    v-if="activeBlock && activeBlock.suspense"
    :key="contentElement._content_type_uid"
  >
    <component
      :is="activeBlock.component"
      v-bind="attrs"
      :content-element="contentElement"
    />
  </Suspense>
  <component
    :is="activeBlock.component"
    v-else-if="activeBlock"
    v-bind="attrs"
    :content-element="contentElement"
  />
  <div
    v-else-if="showNotImplemented"
    v-bind="attrs"
    class="text-sm text-secondary"
  >
    Contentstack block "{{ contentElement._content_type_uid }}" is not
    implemented.
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, computed, useAttrs } from 'vue'
import type { BlockEntry } from '@client/cms/shared/blockDispatch'
import type { ContentstackBlock } from '@shared/types/cms/contentstack'
import AccordionComponent from './AccordionComponent.vue'
import AccordionItemComponent from './AccordionItemComponent.vue'
import ButtonComponent from './ButtonComponent.vue'
import CountdownTimerComponent from './CountdownTimerComponent.vue'
import DividerComponent from './DividerComponent.vue'
import GridComponent from './GridComponent.vue'
import ImageComponent from './ImageComponent.vue'
import LinkComponent from './LinkComponent.vue'
import SectionComponent from './SectionComponent.vue'
import SliderComponent from './SliderComponent.vue'
import TextComponent from './TextComponent.vue'
import VideoComponent from './VideoComponent.vue'
// Async-load the rich text renderer so `@contentstack/utils` ships only when a
// page renders a rich text block.
const RichTextComponent = defineAsyncComponent(
  () => import('./RichTextComponent.vue'),
)

// Async-load the product blocks so their product card and slider trees ship
// only when a page renders one of these blocks. Every page with any CMS block
// loads this dispatcher, but most pages contain none of these three.
const SmartSortingProductsSliderComponent = defineAsyncComponent(
  () => import('./SmartSortingProductsSliderComponent.vue'),
)
const RecentlyViewedProductsComponent = defineAsyncComponent(
  () => import('./RecentlyViewedProductsComponent.vue'),
)
const SingleProductComponent = defineAsyncComponent(
  () => import('./SingleProductComponent.vue'),
)
</script>

<script setup lang="ts">
/**
 * Keyed by `_content_type_uid`, which the generated types declare as a plain
 * `string`, so nothing checks that a key matches its component.
 *
 * See `BlockEntry.suspense` for when to set `suspense`.
 */
const BLOCKS: Record<string, BlockEntry> = {
  'accordion-component': { component: AccordionComponent, suspense: false },
  'accordion_item-component': {
    component: AccordionItemComponent,
    suspense: false,
  },
  'section-component': { component: SectionComponent, suspense: false },
  'grid-component': { component: GridComponent, suspense: false },
  'image-component': { component: ImageComponent, suspense: false },
  'link-component': { component: LinkComponent, suspense: false },
  'richtext-component': { component: RichTextComponent, suspense: true },
  'slider-component': { component: SliderComponent, suspense: false },
  'video-component': { component: VideoComponent, suspense: false },
  'button-component': { component: ButtonComponent, suspense: false },
  'text-component': { component: TextComponent, suspense: false },
  'divider-component': { component: DividerComponent, suspense: false },
  'countdown_timer-component': {
    component: CountdownTimerComponent,
    suspense: false,
  },
  'smart_sorting_products_slider-component': {
    component: SmartSortingProductsSliderComponent,
    suspense: true,
  },
  'recentlyviewedproducts-component': {
    component: RecentlyViewedProductsComponent,
    suspense: true,
  },
  'single_product-component': {
    component: SingleProductComponent,
    suspense: true,
  },
}
/**
 * Each block resolves to a different component type (several wrapped in
 * `Suspense`), so Vue can't auto-inherit fallthrough attrs onto a single
 * stable root. `SectionComponent` relies on the `class` fallthrough for
 * `mt-auto`/`mb-auto` spacing between nested blocks, so attrs are forwarded
 * explicitly.
 */
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()

const { contentElement } = defineProps<{
  contentElement: ContentstackBlock
}>()

// Own keys only, see `BlockEntry`.
const activeBlock = computed(() => {
  const uid = contentElement._content_type_uid
  return uid && Object.hasOwn(BLOCKS, uid) ? BLOCKS[uid] : undefined
})

/** Dev-only: Vite replaces `import.meta.env.DEV` with `false` in production, tree-shaking this branch. */
const showNotImplemented =
  import.meta.env.DEV || import.meta.env.MODE === 'test'
</script>
