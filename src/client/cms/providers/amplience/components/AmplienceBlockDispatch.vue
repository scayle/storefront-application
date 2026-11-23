<template>
  <Suspense
    v-if="activeBlock && activeBlock.suspense"
    :key="contentElement.componentType"
  >
    <component
      :is="activeBlock.component"
      v-bind="attrs"
      :content-element="activeBlock.payload"
    />
  </Suspense>
  <component
    :is="activeBlock.component"
    v-else-if="activeBlock"
    v-bind="attrs"
    :content-element="activeBlock.payload"
  />
  <div
    v-else-if="
      showNotImplemented && !Object.hasOwn(BLOCKS, contentElement.componentType)
    "
    v-bind="attrs"
    class="text-sm text-secondary"
  >
    Amplience block "{{ contentElement.componentType }}" is not implemented.
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, computed, useAttrs } from 'vue'
import type { AmplienceBlock } from '@shared/types/cms/amplience'
import type {
  BlockEntry,
  CheckedBlocks,
} from '@client/cms/shared/blockDispatch'
import AccordionComponent from './AccordionComponent.vue'
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

// Async-load the rich text renderer so the markdown parser ships only when a
// page renders a rich text block.
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
type AmplienceComponentType = AmplienceBlock['componentType']

type PayloadFor<K extends AmplienceComponentType> = NonNullable<
  Extract<AmplienceBlock, { componentType: K }>[K]
>

type Payloads = { [K in AmplienceComponentType]: PayloadFor<K> }

function defineBlocks<
  Blocks extends { [K in AmplienceComponentType]: BlockEntry },
>(blocks: Blocks & NoInfer<CheckedBlocks<Blocks, Payloads>>): Blocks {
  return blocks
}

/**
 * Every block type that has its own envelope needs an entry. See
 * `BlockEntry.suspense` for when to set `suspense`.
 */
const BLOCKS: Record<AmplienceComponentType, BlockEntry> = defineBlocks({
  accordion: { component: AccordionComponent, suspense: false },
  section: { component: SectionComponent, suspense: false },
  grid: { component: GridComponent, suspense: false },
  image: { component: ImageComponent, suspense: false },
  link: { component: LinkComponent, suspense: false },
  richText: { component: RichTextComponent, suspense: true },
  slider: { component: SliderComponent, suspense: false },
  video: { component: VideoComponent, suspense: false },
  button: { component: ButtonComponent, suspense: false },
  text: { component: TextComponent, suspense: false },
  divider: { component: DividerComponent, suspense: false },
  countdownTimer: { component: CountdownTimerComponent, suspense: false },
  productSlider: { component: ProductSliderComponent, suspense: true },
  smartSorting: {
    component: SmartSortingProductsSliderComponent,
    suspense: true,
  },
  recentlyViewed: {
    component: RecentlyViewedProductsComponent,
    suspense: true,
  },
  singleProduct: { component: SingleProductComponent, suspense: true },
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

/**
 * Amplience wraps every block in a discriminated envelope, so this dispatcher
 * narrows on `componentType` and forwards the matching payload key. The payload
 * is optional on every envelope (an author can add a block and leave it empty),
 * hence the payload check in `activeBlock`.
 *
 * `AccordionItemComponent` is deliberately absent: accordion children are bare
 * payloads with no envelope, so `AccordionComponent` renders them directly.
 */
const { contentElement } = defineProps<{
  contentElement: AmplienceBlock
}>()

// An author can save a block before filling it in: `activeBlock` is then
// undefined for a type that has an entry, and the template stays silent. Only a
// type without an entry is a gap in the integration, which is why the template
// checks `BLOCKS` itself.
//
// Own keys only, see `BlockEntry`.
const activeBlock = computed(() => {
  const componentType = contentElement.componentType
  const definition = Object.hasOwn(BLOCKS, componentType)
    ? BLOCKS[componentType]
    : undefined
  const payload = (contentElement as Record<string, unknown>)[componentType]
  return definition && payload ? { ...definition, payload } : undefined
})

/** Dev-only: Vite replaces `import.meta.env.DEV` with `false` in production, tree-shaking this branch. */
const showNotImplemented =
  import.meta.env.DEV || import.meta.env.MODE === 'test'
</script>
