import { computed, toValue, useAttrs, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { useScrollLock } from '@vueuse/core'

interface UseDialogBehaviorOptions {
  /**
   * Whether a click on the dimmed backdrop closes the dialog. Accepts a ref or
   * getter so a consumer prop can toggle it reactively. Defaults to `true`.
   */
  closeOnBackdropClick?: MaybeRefOrGetter<boolean>
  /**
   * Extra work to run whenever the dialog closes through `close()` (e.g. emit a
   * `close` event). Not called when the open ref is flipped directly elsewhere.
   */
  onClose?: () => void
}

interface UseDialogBehaviorReturn {
  /**
   * Fallthrough attributes for the root `<dialog>`, with `class` removed so the
   * component can merge it into its own layout/size utilities. Pair with
   * `inheritAttrs: false`.
   */
  dialogAttrs: ComputedRef<Record<string, unknown>>
  /** Closes the dialog and runs the optional `onClose` callback. */
  close: () => void
  /** Backdrop click handler. Closes only when the `<dialog>` itself is clicked. */
  onBackdropClick: (event: MouseEvent) => void
  /** `cancel` (Escape) handler. Prevents the native close so transitions stay in sync. */
  onCancel: (event: Event) => void
}

/**
 * Provides the behavior common to the design-system `<dialog>` primitives
 * (`SFModal`, `SFSlideIn`): fallthrough-attr forwarding, document scroll lock
 * while open, backdrop-click dismissal, and Escape handling. Each primitive keeps
 * its own template, transition, and visual presentation and only delegates these
 * shared behaviors here.
 *
 * Native `showModal()` provides focus trapping and Escape-to-close; `onCancel`
 * intercepts the native `cancel` event so the exit transition stays in sync with
 * the open model instead of the dialog vanishing instantly.
 *
 * @param open - The dialog's open state model. `close()` sets it to `false`.
 * @param options - Optional `closeOnBackdropClick` toggle and `onClose` callback.
 * @returns `dialogAttrs`, `close`, `onBackdropClick`, and `onCancel` for the `<dialog>`.
 *
 * @example
 * ```ts
 * const isOpen = defineModel<boolean>('visible', { default: false })
 * const { dialogAttrs, close, onBackdropClick, onCancel } = useDialogBehavior(isOpen, {
 *   closeOnBackdropClick: () => closeOnBackdropClick,
 *   onClose: () => emit('close'),
 * })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/accessibility
 */
export function useDialogBehavior(
  open: Ref<boolean>,
  options: UseDialogBehaviorOptions = {},
): UseDialogBehaviorReturn {
  const { closeOnBackdropClick = true, onClose } = options
  const attrs = useAttrs()

  const dialogAttrs = computed(() =>
    Object.fromEntries(
      Object.entries(attrs).filter(([key]) => key !== 'class'),
    ),
  )

  const isScrollLocked = useScrollLock(
    () => (import.meta.env.SSR ? undefined : document.documentElement),
    open.value,
  )

  const close = () => {
    open.value = false
    onClose?.()
  }

  const onBackdropClick = (event: MouseEvent) => {
    if (!open.value || !toValue(closeOnBackdropClick)) {
      return
    }

    if (event.target instanceof Element && event.target.nodeName === 'DIALOG') {
      close()
    }
  }

  const onCancel = (event: Event) => {
    event.preventDefault()
    close()
  }

  watch(open, (isOpen) => {
    isScrollLocked.value = isOpen
  })

  return { dialogAttrs, close, onBackdropClick, onCancel }
}
