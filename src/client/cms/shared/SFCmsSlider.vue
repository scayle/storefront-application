<template>
  <!--
    `slider-tabindex="0"`: slides can be text or images with nothing
    focusable, so the scroller itself is the keyboard path.
  -->
  <SFItemSlider
    class="w-full snap-x snap-mandatory"
    :with-arrows="withArrows"
    :slider-tabindex="0"
    :slider-label="$t('slider.a11y.carousel_label')"
  >
    <div
      v-for="(item, index) in items"
      :key="getItemKey(item, index)"
      class="flex min-w-full snap-start snap-always place-content-center items-center"
      tabindex="-1"
    >
      <slot :item="item" />
    </div>

    <template
      v-if="withArrows"
      #arrows="{ isPrevEnabled, isNextEnabled, prev, next, isScrollable }"
    >
      <div
        class="absolute top-4 right-4 z-10 flex gap-px rounded-full bg-white max-lg:hidden"
        :class="{ hidden: !isScrollable }"
      >
        <SFSliderArrowButton
          direction="previous"
          :disabled="!isPrevEnabled"
          class="rounded-l-full pl-0.5"
          :accessible-label="$t('slider.go_to_previous_item')"
          @click="prev()"
        />
        <SFSliderArrowButton
          direction="next"
          :disabled="!isNextEnabled"
          class="rounded-r-full pr-0.5"
          :accessible-label="$t('slider.go_to_next_item')"
          @click="next()"
        />
      </div>
    </template>

    <template
      v-if="withPaginationIndicators"
      #thumbnails="{ activeSlide, scrollImageIntoView }"
    >
      <div class="absolute bottom-3 z-10 flex w-full justify-center gap-5">
        <button
          v-for="(item, index) in items"
          :key="getItemKey(item, index)"
          type="button"
          class="flex size-6 items-center justify-center rounded-full"
          :aria-label="
            $t('slider.a11y.go_to_slide', {
              index: index + 1,
              total: items.length,
            })
          "
          :aria-current="activeSlide === index ? 'true' : undefined"
          @click="scrollImageIntoView(index, 'smooth')"
        >
          <span
            class="size-2 rounded-full transition-colors"
            :class="activeSlide === index ? 'bg-primary' : 'bg-dot-inactive'"
          />
        </button>
      </div>
    </template>
  </SFItemSlider>
</template>

<script setup lang="ts" generic="T">
import SFItemSlider from '@client/components/ui/core/SFItemSlider.vue'
import SFSliderArrowButton from '@client/components/ui/core/SFSliderArrowButton.vue'

/**
 * Renders a CMS slider block: one slide per item, optional arrows, and
 * optional pagination dots. Shared by every provider's `SliderComponent`,
 * which maps its own fields to these props and renders each slide's block
 * through its block dispatch in the default slot. Editor attributes and
 * directives a provider sets on this component land on the slider root.
 */
const {
  items,
  getItemKey,
  withArrows = true,
  withPaginationIndicators = true,
} = defineProps<{
  /** Slide content, one slide per item. */
  items: T[]
  /** Returns a stable key for an item, for example the CMS entry id. */
  getItemKey: (item: T, index: number) => PropertyKey
  /** Shows previous and next arrows on desktop. */
  withArrows?: boolean
  /** Shows one dot per slide that scrolls to it. */
  withPaginationIndicators?: boolean
}>()

defineSlots<{
  default(props: { item: T }): unknown
}>()
</script>
