<!-- eslint-disable vuejs-accessibility/no-static-element-interactions -- Delegated Tab handler that moves focus between the arrows and the focusable items inside. -->
<template>
  <div
    class="relative"
    :class="{
      'scrollbar-hide overflow-x-hidden overflow-y-scroll': mode === 'vertical',
    }"
    @keydown.tab="onTab"
  >
    <slot name="header" />
    <!-- Arrows render before the items so the tab order matches their visual order. -->
    <component :is="divOrTransition" :duration="150">
      <div v-if="withArrows">
        <slot
          name="arrows"
          v-bind="{ prev, isPrevEnabled, next, isNextEnabled, isScrollable }"
        >
          <!--
            `aria-disabled` rather than `disabled`: a natively disabled button
            cannot hold focus, so a keyboard user who scrolls to an edge would
            lose their place. `prev()` and `next()` ignore activation there.
          -->
          <slot name="prev-button" v-bind="{ prev, isPrevEnabled }">
            <button
              class="absolute z-10 rounded-full bg-primary p-1 text-white aria-disabled:opacity-10"
              :class="{
                'aria-disabled:hidden': hideDisabledArrows,
                'top-1/2 left-2 -translate-y-1/2': mode === 'horizontal',
                'top-2 left-1/2 -translate-x-1/2 rotate-90':
                  mode === 'vertical',
              }"
              :aria-disabled="!isPrevEnabled"
              :aria-label="$t('slider.go_to_previous_item')"
              @click="prev()"
            >
              <IconNavigationLeft class="size-6 p-0.5" />
            </button>
          </slot>
          <slot name="next-button" v-bind="{ next, isNextEnabled }">
            <button
              class="absolute z-10 rounded-full bg-primary p-1 text-white aria-disabled:opacity-10"
              :class="{
                'aria-disabled:hidden': hideDisabledArrows,
                'top-1/2 right-2 -translate-y-1/2': mode === 'horizontal',
                'bottom-2 left-1/2 -translate-x-1/2 rotate-90':
                  mode === 'vertical',
              }"
              :aria-disabled="!isNextEnabled"
              :aria-label="$t('slider.go_to_next_item')"
              @click="next()"
            >
              <IconNavigationRight class="size-6 p-0.5" />
            </button>
          </slot>
        </slot>
      </div>
    </component>
    <component
      :is="sliderRefNodeType"
      ref="sliderRef"
      class="z-10 scrollbar-hide flex size-full shrink-0 snap-mandatory"
      :class="{
        'snap-y flex-col overflow-x-hidden overflow-y-scroll':
          mode === 'vertical',
        'snap-x overflow-x-auto overflow-y-hidden': mode === 'horizontal',
        'overflow-hidden': !scrollable,
        'scroll-px-16': fade && mode === 'horizontal',
      }"
      :data-testid="scrollable ? 'items-slider-scrollable' : undefined"
      :tabindex="sliderTabindex"
      :role="sliderLabel ? 'group' : undefined"
      :aria-label="sliderLabel"
      @scroll.passive="onScroll"
    >
      <slot />
    </component>
    <template v-if="fade && mode === 'horizontal'">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 transition-opacity duration-200 scroll-fade-left"
        :class="isScrollable && isPrevEnabled ? 'opacity-100' : 'opacity-0'"
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 transition-opacity duration-200 scroll-fade-right"
        :class="isScrollable && isNextEnabled ? 'opacity-100' : 'opacity-0'"
      />
    </template>
    <slot
      name="thumbnails"
      :scroll-image-into-view="scrollImageIntoView"
      :active-slide="activeSlide"
    />
  </div>
</template>
<!-- eslint-enable vuejs-accessibility/no-static-element-interactions -->

<script setup lang="ts">
import { ref, nextTick, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { useMounted } from '@vueuse/core'
import { useItemsSlider } from '@client/composables/useItemSlider'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import IconNavigationRight from '@assets/icons/navigation/right.svg'
import { FOCUSABLE_SELECTOR } from '@client/utils/focus'
import SFFadeInTransition from '../transitions/SFFadeInTransition.vue'

const {
  withArrows = false,
  hideDisabledArrows = false,
  mode = 'horizontal',
  scrollable = true,
  sliderTabindex = -1,
  fade = false,
  sliderRefNodeType = 'div',
} = defineProps<{
  /** When true, displays navigation arrows for scrolling. */
  withArrows?: boolean
  /**
   * When true, hides arrows when they are disabled (at start/end). A hidden
   * arrow cannot hold keyboard focus, so the browser moves focus to the
   * document when the slider reaches an edge while that arrow is focused.
   */
  hideDisabledArrows?: boolean
  /** Scroll direction - horizontal or vertical. */
  mode?: 'horizontal' | 'vertical'
  /** Tab index for keyboard navigation. */
  sliderTabindex?: number
  /**
   * Accessible name of the scroll container, which then renders as a named
   * `group`. Set it with a `sliderTabindex` of `0`, so a keyboard user who
   * tabs onto the container hears what it holds. Not for a `ul` or `ol`
   * container, whose list role the `group` role would replace.
   */
  sliderLabel?: string
  /** Whether to allow items scroll. */
  scrollable?: boolean
  /**
   * When true (horizontal mode only), renders a gradient fade on each edge that
   * has more content to scroll towards, signalling scrollability. The fade
   * clears once that edge is reached.
   */
  fade?: boolean

  /**
   * The HTML element type to use for the slider container node.
   * Accepts: 'div', 'ul', or 'ol'.
   * Defaults to 'div'.
   */
  sliderRefNodeType?: 'div' | 'ul' | 'ol'
}>()

const sliderRef = ref<HTMLElement>()
const isMounted = useMounted()

const {
  next,
  prev,
  isNextEnabled,
  isPrevEnabled,
  onScroll,
  scrollImageIntoView,
  activeSlide,
  isScrollable,
} = useItemsSlider(sliderRef as Ref<HTMLElement>, mode)

const divOrTransition = computed(() => {
  return !isMounted.value ? 'div' : SFFadeInTransition
})

nextTick(() => onScroll())

defineExpose({
  scrollImageIntoView,
})

const emit = defineEmits<{
  'update:activeSlide': [newActiveSlide: number]
}>()

defineSlots<{
  /** Default slot for slider items */
  default: () => unknown
  /** Header content displayed above the slider */
  header: () => unknown
  /** Custom navigation arrows container with slider state */
  arrows: (props: {
    prev: (offset?: number) => void
    isPrevEnabled: boolean
    next: (offset?: number) => void
    isNextEnabled: boolean
    isScrollable: boolean | undefined
  }) => unknown
  /** Custom previous button with navigation state */
  'prev-button': (props: {
    prev: (offset?: number) => void
    isPrevEnabled: boolean
  }) => unknown
  /** Custom next button with navigation state */
  'next-button': (props: {
    next: (offset?: number) => void
    isNextEnabled: boolean
  }) => unknown
  /** Thumbnail navigation with scroll and active slide state */
  thumbnails: (props: {
    scrollImageIntoView: (
      index: number,
      scrollBehavior?: 'auto' | 'instant' | 'smooth',
    ) => void
    activeSlide: number
  }) => unknown
}>()

// `FOCUSABLE_SELECTOR` also matches elements that Tab skips: links with
// `tabindex="-1"` and anything hidden.
const tabStops = (root: Element) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (el) => el.tabIndex >= 0 && el.getClientRects().length > 0,
  )

// A forward Tab from the arrows lands on item 1 in DOM order, and focusing it
// scrolls a scrolled slider back to the start. Send it to the first item in
// view instead. Keyed on the Tab key, so clicks, taps and screen reader cursor
// moves keep the browser default.
const onTab = (event: KeyboardEvent) => {
  const slider = sliderRef.value
  const from = event.target as HTMLElement
  // Alt stays allowed: Option+Tab is how Safari reaches buttons and links.
  if (
    event.shiftKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.defaultPrevented ||
    !slider ||
    (from !== slider && slider.contains(from))
  ) {
    return
  }
  const stops = tabStops(event.currentTarget as HTMLElement)
  // The browser's next Tab stop. `from` can sit outside the tab order, such as
  // a scroller with `tabindex="-1"` that a click focused.
  const next = stops.find(
    (stop) =>
      from.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING,
  )
  if (!next || next === slider || !slider.contains(next)) {
    return
  }
  const [start, end] =
    mode === 'horizontal'
      ? (['left', 'right'] as const)
      : (['top', 'bottom'] as const)
  const view = slider.getBoundingClientRect()
  const items = [...slider.children]
  const shares = items.map((item) => {
    const rect = item.getBoundingClientRect()
    const size = rect[end] - rect[start]
    const shown =
      Math.min(rect[end], view[end] + 1) -
      Math.max(rect[start], view[start] - 1)
    return size > 0 ? Math.min(1, Math.max(0, shown) / size) : 0
  })
  // The most visible item, the first one on a tie (with room for subpixel
  // rounding). A fully visible item beats one cut off at an edge, and while
  // the slider is still scrolling it is the item mostly on screen.
  const mostVisible = shares.findIndex(
    (share) => share >= Math.max(...shares) - 0.01,
  )
  if (!shares[mostVisible]) {
    return
  }
  const target = stops.find((stop) =>
    items.slice(mostVisible).some((item) => item.contains(stop)),
  )
  if (!target || target === next) {
    return
  }
  event.preventDefault()
  target.focus()
}

watch(activeSlide, (newActiveSlide) => {
  emit('update:activeSlide', newActiveSlide)
})
</script>
