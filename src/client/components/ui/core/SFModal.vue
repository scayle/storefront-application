<template>
  <ClientOnly>
    <component :is="transitionComponent" :appear="appear">
      <!-- eslint-disable vuejs-accessibility/no-autofocus -- `autofocus` on the dialog itself makes it the initial focus target, so no inner control is focused on open. -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Backdrop click is a pointer shortcut. Escape closes the dialog through its `cancel` event. -->
      <dialog
        v-dialog.modal="visible"
        autofocus
        tabindex="-1"
        aria-modal="true"
        :aria-label="dialogAriaLabel"
        :aria-labelledby="dialogAriaLabelledBy"
        :aria-describedby="description ? descriptionId : undefined"
        :class="[dialogClasses, { 'backdrop:opacity-0': !visible }]"
        v-bind="dialogAttrs"
        @click="onBackdropClick"
        @cancel="onCancel"
      >
        <div :class="dialogLayoutClasses">
          <div :class="panelClasses">
            <template v-if="isStructured">
              <div class="flex shrink-0 items-start gap-2">
                <div class="flex min-w-0 flex-1 flex-col">
                  <h2
                    :id="titleId"
                    class="min-w-0 pt-1.5 heading-section-2 text-xl"
                  >
                    {{ headline }}
                  </h2>
                  <p
                    v-if="description"
                    :id="descriptionId"
                    class="pt-1.5 body-default-secondary"
                  >
                    {{ description }}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="close-button"
                  class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-gray-200 max-lg:bg-gray-200 lg:size-8"
                  :aria-label="$t('global.close')"
                  @click="close"
                >
                  <IconNavigationClose class="size-2.5 fill-current" />
                </button>
              </div>
              <div
                v-if="$slots.default"
                :class="[contentScrollClasses, 'pt-6', 'flex flex-col']"
                data-testid="modal-content"
              >
                <slot :close-modal="close" />
              </div>
              <div v-if="showActionRow" :class="[actionRowClasses, 'shrink-0']">
                <slot name="actions" :close-modal="close" />
                <SFButton
                  data-testid="modal-cancel-action"
                  :variant="ButtonVariant.SECONDARY"
                  @click="onCancelClick"
                >
                  {{ cancelLabel ?? $t('global.cancel') }}
                </SFButton>
              </div>
            </template>
            <template v-else>
              <button
                type="button"
                data-testid="close-button"
                class="absolute top-4 right-4 z-20 flex size-7 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-gray-200 max-lg:bg-gray-200 lg:size-8"
                :aria-label="$t('global.close')"
                @click="close"
              >
                <IconNavigationClose class="size-2.5 fill-current" />
              </button>
              <div :class="contentScrollClasses" data-testid="modal-content">
                <slot :close-modal="close" />
              </div>
            </template>
          </div>
        </div>
        <!--
          Native `showModal()` makes everything outside this `<dialog>` inert, so
          the app-level `<SFLiveAnnouncer>` in the background cannot announce while
          the modal is open. Hosting a mirror inside the dialog keeps live
          announcements audible. Only one announcer is ever in a non-inert
          context, so this does not double-announce.
        -->
        <SFLiveAnnouncer />
      </dialog>
      <!-- eslint-enable vuejs-accessibility/no-autofocus -->
    </component>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * Design-system modal built on the native `<dialog>` element.
 *
 * Use structured props (`headline`, `description`) plus the `actions` slot for
 * confirmation dialogs that match the Figma modal spec. Put primary controls in
 * `actions`. Cancel is always rendered after the slot when the action row is
 * shown. The action row appears when `#actions` is provided or when `cancelLabel`
 * is set for a standalone dismiss button. Use the default slot alone for bespoke
 * layouts and pass `label` or `labelledBy` for the accessible name.
 *
 * Native `showModal()` provides focus trapping and Escape-to-close. This component
 * intercepts `@cancel` so exit transitions stay in sync with `v-model:visible`.
 */
import type { Component } from 'vue'
import { computed, useAttrs, useId, useSlots } from 'vue'
import { ButtonVariant, ModalSize } from '@client/utils/constants'
import type { ModalSize as ModalSizeType } from '@client/utils/constants'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconNavigationClose from '@assets/icons/navigation/close.svg'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import SFLiveAnnouncer from '@client/components/ui/core/SFLiveAnnouncer.vue'
import { useDialogBehavior } from '@client/composables/useDialogBehavior'
import { vDialog } from '../../../directives/dialog'
import SFFadeInTransition from '../transitions/SFFadeInTransition.vue'

type BaseProps = {
  /**
   * Vue component to use for the modal transition animation.
   */
  transitionComponent?: Component
  /**
   * Whether to apply transition on initial render.
   */
  appear?: boolean
  /**
   * Visible modal headline. Enables the structured Figma layout (title,
   * optional description, optional content slot, action row).
   */
  headline?: string
  /**
   * Supporting copy below the headline. Hidden when omitted.
   */
  description?: string
  /**
   * Desktop panel width. Ignored below the `lg` breakpoint (full width on mobile).
   */
  size?: ModalSizeType
  /**
   * Cancel control label in the action row. Defaults to the `global.cancel` translation.
   * Setting this prop renders the cancel button even when `#actions` is omitted.
   */
  cancelLabel?: string
  /**
   * When true, clicking the dimmed backdrop closes the modal.
   */
  closeOnBackdropClick?: boolean
  /**
   * When false, the dialog renders without a dimmed backdrop. Use for fullscreen
   * modals where the panel already covers the viewport.
   */
  backdrop?: boolean
}

type AccessibleName =
  | {
      /**
       * Accessible name for custom-slot modals without a visible `headline`.
       * Bound to `aria-label`.
       */
      label: string
      labelledBy?: never
    }
  | {
      /**
       * `id` of a visible heading inside a custom-slot modal. Bound to
       * `aria-labelledby`. Preferred over `label` when a visible title exists.
       */
      labelledBy: string
      label?: never
    }
  | {
      label?: never
      labelledBy?: never
    }

const {
  transitionComponent = SFFadeInTransition,
  appear = false,
  headline,
  description,
  size = ModalSize.MD,
  cancelLabel,
  closeOnBackdropClick = true,
  backdrop = true,
  label,
  labelledBy,
} = defineProps<BaseProps & AccessibleName>()

defineSlots<{
  /** Optional body between the description and the action row. */
  default?: (props: { closeModal: () => void }) => unknown
  /** Primary and secondary footer actions. Cancel is fixed after this slot. */
  actions?: (props: { closeModal: () => void }) => unknown
}>()

const visible = defineModel<boolean>('visible', {
  type: Boolean,
  default: false,
})

const emit = defineEmits<{ cancel: []; close: [] }>()

const attrs = useAttrs()
const slots = useSlots()
const titleId = useId()
const descriptionId = useId()

const { dialogAttrs, close, onBackdropClick, onCancel } = useDialogBehavior(
  visible,
  {
    closeOnBackdropClick: () => closeOnBackdropClick,
    onClose: () => emit('close'),
  },
)

const isStructured = computed(() => Boolean(headline))

const showActionRow = computed(() => Boolean(slots.actions || cancelLabel))

const dialogAriaLabel = computed(() => {
  if (isStructured.value) {
    return undefined
  }
  return label
})

const dialogAriaLabelledBy = computed(() => {
  if (isStructured.value) {
    return titleId
  }
  return labelledBy
})

/**
 * Backdrop and reset on `<dialog>`. Use `open:` for size (not `flex`/`grid` on the
 * element): those break `display: none` when closed.
 */
const dialogClasses = computed(() => [
  'border-0 bg-transparent p-0',
  ...(backdrop
    ? [
        'open:fixed open:inset-0 open:m-0 open:size-full open:max-h-dvh open:max-w-full open:overflow-visible',
        'backdrop:bg-primary/50 backdrop:transition-opacity backdrop:duration-200 backdrop:ease-linear',
        'starting:backdrop:opacity-0',
      ]
    : ['fixed inset-0 m-0 size-full max-h-dvh max-w-full overflow-visible']),
])

const dialogLayoutClasses = computed(() => [
  'box-border flex h-full min-h-0 w-full overflow-hidden',
  backdrop ? 'p-4' : 'p-0',
  isStructured.value
    ? 'max-lg:items-start max-lg:pt-20 max-lg:pb-5 lg:items-center lg:justify-center'
    : 'items-center justify-center',
])

const panelSizeClasses: Record<ModalSizeType, string> = {
  [ModalSize.SM]: 'lg:w-modal-sm lg:max-w-modal-sm',
  [ModalSize.MD]: 'lg:w-modal-md lg:max-w-modal-md',
  [ModalSize.LG]: 'lg:w-modal-lg lg:max-w-modal-lg',
}

const panelBaseClasses = computed(() => {
  const base = ['relative w-full']

  if (!backdrop) {
    return [...base, 'shrink-0']
  }

  return [
    ...base,
    'flex max-h-full min-h-0 flex-col overflow-hidden',
    'rounded-xl bg-white shadow-overlay',
    panelSizeClasses[size],
  ]
})

const contentScrollClasses = computed(() => [
  'min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-y-contain',
  backdrop ? 'flex-1' : 'h-full',
])

const panelClasses = computed(() => {
  if (!isStructured.value) {
    return [...panelBaseClasses.value, attrs.class]
  }

  return [
    ...panelBaseClasses.value,
    'gap-0',
    'p-4 lg:px-5 lg:pb-5',
    attrs.class,
  ]
})

const stackActionsOnMobile = computed(
  () => (slots.actions?.() ?? []).length > 1,
)

const actionRowClasses = computed(() => [
  'flex w-full flex-wrap items-end gap-3 pt-6',
  stackActionsOnMobile.value
    ? 'max-lg:flex-col max-lg:gap-2 max-lg:[&>*]:w-full'
    : 'max-lg:[&>*:first-child]:min-w-0 max-lg:[&>*:first-child]:flex-1',
])

const onCancelClick = () => {
  emit('cancel')
  close()
}

defineOptions({
  inheritAttrs: false,
})
</script>
