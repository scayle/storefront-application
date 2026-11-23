<template>
  <Suspense v-if="activeBlock && activeBlock.suspense" :key="contentTypeId">
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
    v-else-if="showNotImplemented && contentElement"
    v-bind="attrs"
    class="text-sm text-secondary"
  >
    Contentful block "{{ contentTypeId }}" is not implemented.
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, computed, useAttrs } from 'vue'
import type { Component } from 'vue'
import type { ContentfulContentElement } from '@shared/types/cms/contentful'
import type { ContentElementOf } from '@client/cms/shared/blockDispatch'
import {
  isTypeAccordionComponent,
  isTypeAccordionItemComponent,
  isTypeButtonComponent,
  isTypeCountdownTimerComponent,
  isTypeDividerComponent,
  isTypeGridComponent,
  isTypeImageComponent,
  isTypeLinkComponent,
  isTypeProductSliderComponent,
  isTypeSingleProduct,
  isTypeSmartSortingProductsSliderComponent,
  isTypeRecentlyViewedProductsComponent,
  isTypeRichTextComponent,
  isTypeSectionComponent,
  isTypeSliderComponent,
  isTypeTextComponent,
  isTypeVideoComponent,
} from '@shared/types/cms/contentful'
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
// Async-load the rich text renderer so `@contentful/rich-text-html-renderer`
// ships only when a page renders a rich text block.
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
/**
 * Pairs a generated `isType*` guard with the component built for the type it
 * narrows to. Fails `pnpm typecheck` when the component's `contentElement`
 * prop cannot accept the type the guard narrows to. A component whose props
 * accept several content types passes under any of those guards, so this
 * catches a clearly wrong component, not every swap.
 *
 * See `BlockEntry.suspense` for when to set `suspense`.
 */
function toBlockEntry<T extends ContentfulContentElement, C extends Component>(
  entry: {
    guard: (value: unknown) => value is T
    component: C
    suspense: boolean
  } & NoInfer<
    [T] extends [ContentElementOf<C>]
      ? unknown
      : { component: 'component does not accept the type of its guard' }
  >,
) {
  return { ...entry, component: entry.component as Component }
}

/**
 * Each generated guard reads one content type id, so entries never overlap and
 * their order does not matter.
 */
const BLOCKS = [
  toBlockEntry({
    guard: isTypeAccordionComponent,
    component: AccordionComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeAccordionItemComponent,
    component: AccordionItemComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeSectionComponent,
    component: SectionComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeGridComponent,
    component: GridComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeImageComponent,
    component: ImageComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeLinkComponent,
    component: LinkComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeRichTextComponent,
    component: RichTextComponent,
    suspense: true,
  }),
  toBlockEntry({
    guard: isTypeSliderComponent,
    component: SliderComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeVideoComponent,
    component: VideoComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeButtonComponent,
    component: ButtonComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeTextComponent,
    component: TextComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeDividerComponent,
    component: DividerComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeCountdownTimerComponent,
    component: CountdownTimerComponent,
    suspense: false,
  }),
  toBlockEntry({
    guard: isTypeProductSliderComponent,
    component: ProductSliderComponent,
    suspense: true,
  }),
  toBlockEntry({
    guard: isTypeSingleProduct,
    component: SingleProductComponent,
    suspense: true,
  }),
  toBlockEntry({
    guard: isTypeSmartSortingProductsSliderComponent,
    component: SmartSortingProductsSliderComponent,
    suspense: true,
  }),
  toBlockEntry({
    guard: isTypeRecentlyViewedProductsComponent,
    component: RecentlyViewedProductsComponent,
    suspense: true,
  }),
]
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
  contentElement: ContentfulContentElement | undefined
}>()

const activeBlock = computed(() => {
  if (!contentElement) {
    return undefined
  }
  return BLOCKS.find((block) => block.guard(contentElement))
})

const contentTypeId = computed(() => contentElement?.sys?.contentType?.sys?.id)

/** Dev-only: Vite replaces `import.meta.env.DEV` with `false` in production, tree-shaking this branch. */
const showNotImplemented =
  import.meta.env.DEV || import.meta.env.MODE === 'test'
</script>
