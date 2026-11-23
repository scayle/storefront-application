<template>
  <SFSlideInTransition :from="slideFrom" appear>
    <!-- eslint-disable vuejs-accessibility/no-autofocus -- `autofocus` on the dialog itself makes it the initial focus target, so no inner control is focused on open. -->
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Backdrop click is a pointer shortcut. Escape closes the dialog through its `cancel` event. -->
    <dialog
      ref="slideIn"
      v-dialog.modal="isOpen"
      autofocus
      tabindex="-1"
      aria-modal="true"
      v-bind="dialogAttrs"
      :aria-label="dialogAriaLabel"
      :aria-labelledby="dialogAriaLabelledBy"
      class="z-20 h-full max-h-dvh overflow-hidden border-0 bg-transparent p-0 transition-all backdrop:bg-primary/50 backdrop:transition-opacity backdrop:duration-200 backdrop:ease-linear max-lg:fixed max-lg:inset-x-0 max-lg:top-auto max-lg:bottom-0 max-lg:m-0 max-lg:w-full max-lg:max-w-full lg:my-2 lg:mr-2 lg:ml-auto lg:h-[calc(100dvh-1rem)] lg:max-h-[calc(100dvh-1rem)] starting:backdrop:opacity-0"
      :class="dialogClasses"
      @click="onBackdropClick"
      @cancel="onCancel"
    >
      <div
        class="flex size-full min-h-0 flex-col overflow-hidden bg-white lg:rounded-xl"
        data-testid="slide-in-panel"
      >
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
          :style="scrollPaddingStyle"
          data-testid="slide-in-overflow"
        >
          <div class="flex min-h-full flex-col">
            <header
              v-if="showBuiltInHeader || hasHeaderSlot"
              ref="stickyHeader"
              class="sticky top-0 z-20 shrink-0 bg-white/90 px-6 py-5 backdrop-blur-xs"
            >
              <slot
                name="header"
                :close="close"
                :toggle="toggle"
                :label="label"
                :description="description"
                :heading-id="headingId"
              >
                <div class="flex flex-col gap-2 pr-8">
                  <p
                    :id="headingId"
                    class="flex items-center gap-2 heading-section-1"
                  >
                    <span
                      v-if="$slots.icon"
                      class="inline-flex shrink-0 text-primary [&_svg]:size-6"
                    >
                      <slot name="icon" />
                    </span>
                    {{ label }}
                  </p>
                  <p v-if="description" class="body-default-secondary">
                    {{ description }}
                  </p>
                </div>
                <button
                  type="button"
                  class="absolute top-5 right-6 flex size-6 cursor-pointer items-center justify-center rounded-full text-secondary hover:text-primary"
                  data-testid="slide-in-close"
                  :aria-label="$t('global.close')"
                  @click="close"
                >
                  <IconNavigationClose class="size-3" aria-hidden="true" />
                </button>
              </slot>
            </header>

            <div :style="footerSlotBodyStyle" class="z-10">
              <slot />
            </div>
          </div>
        </div>

        <footer v-if="hasFooterSlot" class="relative shrink-0 bg-white">
          <div
            class="pointer-events-none absolute inset-x-0 bottom-full h-full bg-[linear-gradient(180deg,var(--color-transparent)_0%,var(--color-white)_100%)]"
            :style="footerFadeStyle"
          />
          <div
            class="flex w-full items-center justify-end gap-3 p-4 max-lg:pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
          >
            <slot name="footer" :close="close" :toggle="toggle" />
          </div>
        </footer>
      </div>
      <!--
        Native `showModal()` makes everything outside this `<dialog>` inert, so
        the app-level `<SFLiveAnnouncer>` in the background cannot announce while
        the slide-in is open. Hosting a mirror inside the dialog keeps live
        announcements (e.g. filter result counts) audible. Only one announcer is
        ever in a non-inert context, so this does not double-announce.
      -->
      <SFLiveAnnouncer />
    </dialog>
    <!-- eslint-enable vuejs-accessibility/no-autofocus -->
  </SFSlideInTransition>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  useAttrs,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import { syncRefs, useElementSize, useEventListener } from '@vueuse/core'
import SFLiveAnnouncer from '@client/components/ui/core/SFLiveAnnouncer.vue'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'
import { useDialogBehavior } from '@client/composables/useDialogBehavior'
import { useRouterEvent } from '@client/composables/useRouterEvent'
import { isPartialReload } from '@client/utils/router'
import IconNavigationClose from '@assets/icons/navigation/close.svg'
import { vDialog } from '../../../directives/dialog'
import SFSlideInTransition from '../transitions/SFSlideInTransition.vue'

type PanelSize = 'sm' | 'md' | 'lg'

type BaseProps = {
  /**
   * Optional description shown below the title in the built-in header.
   */
  description?: string
  /**
   * Desktop panel width.
   */
  size?: PanelSize
  /**
   * Whether to close when the route changes.
   */
  closeOnRouteChange?: boolean
}

type AccessibleName =
  | {
      /**
       * Panel title shown in the built-in header (when `#header` is not used). Also
       * sets `aria-labelledby` on the dialog. With a custom `#header`, use as
       * `aria-label` only.
       */
      label: string
      labelledBy?: never
    }
  | {
      /**
       * `id` of a visible heading in a custom `#header` when `label` is not passed.
       */
      labelledBy: string
      label?: never
    }

const {
  description,
  size = 'sm',
  closeOnRouteChange = true,
  label,
  labelledBy,
} = defineProps<BaseProps & AccessibleName>()

defineOptions({
  inheritAttrs: false,
})

const emit = defineEmits<{
  /**
   * Emitted when the panel opens.
   */
  open: []
  /**
   * Emitted when the panel closes.
   */
  close: []
}>()

const isOpen = defineModel<boolean>('isOpen', {
  required: true,
  default: false,
})

const attrs = useAttrs()
const { dialogAttrs, close, onBackdropClick, onCancel } =
  useDialogBehavior(isOpen)
const breakpoints = useDefaultBreakpoints()
const slots = useSlots()
const headingId = useId()
const scrollPaddingReady = ref(false)
const stickyHeaderRef = useTemplateRef<HTMLElement>('stickyHeader')
const { height: stickyHeaderHeight } = useElementSize(stickyHeaderRef)

const slideFrom = computed<'left' | 'right' | 'top' | 'bottom'>(() =>
  breakpoints.greaterOrEqual('lg').value ? 'right' : 'bottom',
)

const hasHeaderSlot = computed(() => Boolean(slots.header))

const showBuiltInHeader = computed(() => Boolean(label) && !hasHeaderSlot.value)

const hasFooterSlot = computed(() => Boolean(slots.footer))

const dialogAriaLabel = computed(() => {
  if (labelledBy || showBuiltInHeader.value) {
    return undefined
  }

  return label
})

const dialogAriaLabelledBy = computed(() => {
  if (labelledBy) {
    return labelledBy
  }

  if (showBuiltInHeader.value) {
    return headingId
  }

  return undefined
})

const DIALOG_SIZE_CLASSES: Record<PanelSize, string> = {
  sm: 'lg:w-[390px]',
  md: 'lg:w-[420px]',
  lg: 'lg:w-[460px]',
}

const FOOTER_FADE_HEIGHT_PX = 40

const dialogClasses = computed(() => [
  DIALOG_SIZE_CLASSES[size],
  { 'backdrop:opacity-0': !isOpen.value },
  attrs.class,
])

const footerFadeStyle = computed(() => ({
  height: `${FOOTER_FADE_HEIGHT_PX}px`,
}))

/**
 * Keeps a keyboard-focused element from landing underneath the sticky header.
 * Without this the browser scrolls the focus target flush to the top of the
 * scrollport, which the header then covers. The header grows with its content
 * (the add-to-basket panel pins a product card and two CTAs there), so the
 * offset is measured rather than hardcoded.
 */
const scrollPaddingStyle = computed(() => {
  if (!stickyHeaderHeight.value) {
    return undefined
  }

  return { scrollPaddingTop: `${stickyHeaderHeight.value}px` }
})

const footerSlotBodyStyle = computed(() => {
  if (!scrollPaddingReady.value || !hasFooterSlot.value) {
    return undefined
  }

  return {
    paddingBottom: `${FOOTER_FADE_HEIGHT_PX}px`,
  }
})

// Syncs both refs after nextTick. Applying body padding while closed causes a pre-scrolled slide-in.
syncRefs(isOpen, scrollPaddingReady, { flush: 'post' })

const toggle = () => {
  isOpen.value = !isOpen.value
}

// `open`/`close` are emitted here rather than through `useDialogBehavior`'s `onClose`
// because the slide-in reports both directions and reacts to external
// `isOpen` flips (e.g. `closeOnRouteChange`), which the composable callback,
// fired only from `close()`, does not cover.
watch(isOpen, (value, wasOpen) => {
  if (value && !wasOpen) {
    emit('open')
  } else if (!value && wasOpen) {
    emit('close')
  }
})

// A partial reload or a prefetch is not the user leaving the page: the panel's
// own content triggers them (a wishlist toggle, a basket mutation), and closing
// on one takes the interaction with it.
useRouterEvent('before', (event) => {
  if (isPartialReload(event.detail.visit)) {
    return
  }
  if (closeOnRouteChange && isOpen.value) {
    close()
  }
})

// Inertia skips the `before` event for history navigations: `handlePopstateEvent`
// goes straight to `cancelAll`/`setQuietly`/`fireNavigateEvent`. Listening for
// `navigate` instead of `before` would cover Back, but it also fires for partial
// reloads and carries no `visit` to tell them apart, so the popstate case gets
// its own listener.
useEventListener('popstate', () => {
  if (closeOnRouteChange && isOpen.value) {
    close()
  }
})
</script>
