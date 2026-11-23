<template>
  <div
    ref="containerEl"
    popover="manual"
    class="pointer-events-none fixed inset-x-0 top-(--toast-top) z-30 m-0 scrollbar-hide flex max-h-[calc(100dvh-var(--toast-top)-3rem)] w-auto justify-center overflow-auto border-0 bg-transparent px-4 pt-4 sm:justify-end sm:px-8"
    :style="{ '--toast-top': `${toastTopPx}px` }"
    data-testid="toast-container"
  >
    <TransitionGroup
      name="notification"
      tag="div"
      enter-from-class="opacity-0 -translate-y-4"
      leave-to-class="opacity-0 -translate-y-4"
      move-class="transition-all duration-500"
      class="pointer-events-auto flex w-full max-w-lg flex-col items-stretch gap-2 self-start sm:w-auto sm:items-end"
    >
      <SFToast
        v-for="item in notifications"
        :key="item.id"
        :notification="item"
        class="transition-all"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import SFToast from '@client/components/ui/toast/SFToast.vue'
import { useToast } from '@client/composables/useToast'

const { anchor } = defineProps<{
  /**
   * The element toasts sit just below, in `Layout` the header together with
   * the promotion ribbon above it. Its bottom edge moves up as the page
   * scrolls, and toasts stick to the viewport top once it has scrolled past.
   * Without it, toasts sit at the viewport top.
   */
  anchor?: HTMLElement | null
}>()

// Announcing happens at the source in `useToast().show()`; this container only
// renders the visual toasts.
const { notifications } = useToast()

const hasNotifications = computed(() => notifications.value.length > 0)

// Reading the anchor's edge rather than adding up fixed heights covers the
// promotion ribbon, whether shown, dismissed or hidden behind the mobile
// sidebar, and the header's height at each breakpoint. The anchor sits at the
// top of the page, so its edge only moves within the page when it resizes:
// that position is measured when a toast appears and on each resize, which is
// how a ribbon closed or removed by a navigation under an open toast moves it
// up, and a scroll only subtracts the scroll offset from it. The container
// renders on every page using `Layout` but is empty most of the time, so none
// of this runs while no toast is shown.
const anchorBottomInPage = shallowRef(0)
const pageScrollY = shallowRef(0)

const toastTopPx = computed(() =>
  Math.max(0, anchorBottomInPage.value - pageScrollY.value),
)

const readScrollY = () => {
  pageScrollY.value = window.scrollY
}

const measureAnchor = () => {
  readScrollY()
  anchorBottomInPage.value =
    (anchor?.getBoundingClientRect().bottom ?? 0) + pageScrollY.value
}

let stopTracking: (() => void) | undefined

// Immediate, because toasts can already be open when the container mounts, as
// when one shown on a page using `SimpleLayout` is still open after navigating
// to one using `Layout`. The anchor is not set yet at that point; the resize
// observer measures it once `Layout` passes it in.
watch(
  hasNotifications,
  (shown) => {
    stopTracking?.()
    stopTracking = undefined
    if (!shown || import.meta.env.SSR) {
      return
    }
    measureAnchor()
    const stopScrollListener = useEventListener('scroll', readScrollY, {
      passive: true,
    })
    const { stop: stopResizeObserver } = useResizeObserver(
      () => anchor,
      measureAnchor,
    )
    stopTracking = () => {
      stopScrollListener()
      stopResizeObserver()
    }
  },
  { immediate: true },
)

// Started inside a watch callback, the tracking is not reliably tied to this
// component, so it would outlive an unmount with a toast still shown.
onBeforeUnmount(() => stopTracking?.())

const containerEl = ref<HTMLElement>()

/**
 * Promotes the container into the browser's top layer via the native Popover
 * API. Native `<dialog>` elements opened with `showModal()` (filter/promotion/
 * shop-switcher slide-ins, modals) are themselves rendered in the top layer,
 * which always paints above the rest of the document regardless of `z-index`
 * — so a plain `fixed` toast cannot appear above an open one. Re-promoting on
 * every new notification moves this container back to the top of the
 * top-layer stack, above whatever dialog was opened after it.
 */
const promote = () => {
  const el = containerEl.value
  if (!el) {
    return
  }
  if (el.matches(':popover-open')) {
    el.hidePopover()
  }
  el.showPopover()
}

onMounted(promote)

watch(
  () => notifications.value.length,
  (next, prev) => {
    if (next > prev) {
      promote()
    }
  },
)
</script>
