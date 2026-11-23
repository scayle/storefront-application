<template>
  <Suspense
    v-if="activeBlock && activeBlock.suspense"
    :key="contentElement.component"
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
    Storyblok block "{{ contentElement.component }}" is not implemented.
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, computed, useAttrs } from 'vue'
import type { StoryblokBlock } from '@shared/types/cms/storyblok'
import type {
  BlockEntry,
  CheckedBlocks,
} from '@client/cms/shared/blockDispatch'
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
// Async-load the rich text renderer so `@storyblok/richtext` (and its
// TipTap/ProseMirror deps) ship only when a page renders a rich text block.
const RichTextComponent = defineAsyncComponent(
  () => import('./RichTextComponent.vue'),
)

// Async-load the product blocks so their product card and slider trees ship
// only when a page renders one of these blocks. Every page with any CMS block
// loads this dispatcher, but most pages contain none of these four.
const ProductSliderComponent = defineAsyncComponent(
  () => import('./ProductSliderComponent.vue'),
)
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
type StoryblokComponentType = StoryblokBlock['component']

type PayloadFor<K extends StoryblokComponentType> = Extract<
  StoryblokBlock,
  { component: K }
>

type Payloads = { [K in StoryblokComponentType]: PayloadFor<K> }

function defineBlocks<
  Blocks extends { [K in StoryblokComponentType]: BlockEntry },
>(blocks: Blocks & NoInfer<CheckedBlocks<Blocks, Payloads>>): Blocks {
  return blocks
}

/**
 * Every Storyblok block type needs an entry. See `BlockEntry.suspense` for when
 * to set `suspense`.
 */
const BLOCKS: Record<StoryblokComponentType, BlockEntry> = defineBlocks({
  AccordionComponent: { component: AccordionComponent, suspense: false },
  AccordionItemComponent: {
    component: AccordionItemComponent,
    suspense: false,
  },
  SectionComponent: { component: SectionComponent, suspense: false },
  GridComponent: { component: GridComponent, suspense: false },
  ImageComponent: { component: ImageComponent, suspense: false },
  LinkComponent: { component: LinkComponent, suspense: false },
  RichTextComponent: { component: RichTextComponent, suspense: true },
  SliderComponent: { component: SliderComponent, suspense: false },
  VideoComponent: { component: VideoComponent, suspense: false },
  ButtonComponent: { component: ButtonComponent, suspense: false },
  TextComponent: { component: TextComponent, suspense: false },
  DividerComponent: { component: DividerComponent, suspense: false },
  CountdownTimerComponent: {
    component: CountdownTimerComponent,
    suspense: false,
  },
  RecentlyViewedProductsComponent: {
    component: RecentlyViewedProductsComponent,
    suspense: true,
  },
  ProductSliderComponent: {
    component: ProductSliderComponent,
    suspense: true,
  },
  SingleProductComponent: {
    component: SingleProductComponent,
    suspense: true,
  },
  SmartSortingProductsSliderComponent: {
    component: SmartSortingProductsSliderComponent,
    suspense: true,
  },
})
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
  contentElement: StoryblokBlock
}>()

// Own keys only, see `BlockEntry`.
const activeBlock = computed(() =>
  Object.hasOwn(BLOCKS, contentElement.component)
    ? BLOCKS[contentElement.component]
    : undefined,
)

/** Dev-only: Vite replaces `import.meta.env.DEV` with `false` in production, tree-shaking this branch. */
const showNotImplemented =
  import.meta.env.DEV || import.meta.env.MODE === 'test'
</script>
