/**
 * A Vue directive to control native HTML `<dialog>` elements with Vue transition support.
 *
 * This directive manages dialog visibility using the native `HTMLDialogElement` API methods:
 * - `show()` - Opens dialog (non-modal, allows interaction with page)
 * - `showModal()` - Opens dialog as modal (blocks interaction with page)
 * - `close()` - Closes the dialog
 *
 * The directive integrates seamlessly with Vue's `<Transition>` component, properly
 * coordinating transition lifecycle hooks with dialog state changes.
 *
 * **Modifiers:**
 * - `.modal` - Opens the dialog as a modal using `showModal()` instead of `show()`
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement | HTMLDialogElement API}
 * @see {@link https://vuejs.org/guide/built-ins/transition.html | Vue Transition Component}
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const isDialogOpen = ref(false)
 * </script>
 *
 * <template>
 *   <!-- Modal dialog (blocks background interaction) -->
 *   <Transition name="fade">
 *     <dialog v-dialog.modal="isDialogOpen">
 *       <h2>Modal Dialog</h2>
 *       <p>This is a modal dialog with backdrop.</p>
 *       <button @click="isDialogOpen = false">Close</button>
 *     </dialog>
 *   </Transition>
 *
 *   <!-- Non-modal dialog (allows background interaction) -->
 *   <Transition name="slide">
 *     <dialog v-dialog="isDialogOpen">
 *       <p>Non-modal dialog content</p>
 *     </dialog>
 *   </Transition>
 *
 *   <button @click="isDialogOpen = true">Open Dialog</button>
 * </template>
 * ```
 */

import type { ObjectDirective } from 'vue'

function toggleDialog(
  el: HTMLDialogElement,
  value: unknown,
  modal?: boolean,
): void {
  if (!value) {
    el.close()
    return
  }

  if (modal) {
    el.showModal()
    return
  }

  el.show()
}

/**
 * Moves focus to the `<dialog>` element itself when it opens as a modal.
 *
 * `showModal()` otherwise auto-focuses the first focusable descendant (or, in
 * some engines, a non-semantic wrapper child), which paints a spurious
 * `:focus-visible` ring on e.g. the close button and lands screen-reader focus
 * on an anonymous element. Focusing the dialog (the element that carries
 * `role="dialog"` and the accessible name) is deterministic across repeated
 * opens — unlike the `autofocus` content attribute, which engines honor
 * inconsistently on the second and subsequent `showModal()` calls.
 *
 * A descendant that opts in with `autofocus` (e.g. a search field) is left to
 * the native algorithm. Requires the dialog to be focusable (`tabindex="-1"`).
 */
function focusDialog(el: HTMLDialogElement): void {
  if (el.querySelector('[autofocus]')) {
    return
  }
  el.focus()
}

export const vDialog: ObjectDirective<HTMLDialogElement> = {
  beforeMount(el, { value }, { transition }) {
    if (transition && value) {
      transition.beforeEnter(el)
    }
  },

  mounted(el, { value, modifiers }, { transition }) {
    if (transition && value) {
      transition.enter(el)
    }
    toggleDialog(el, value, modifiers.modal)
    if (value && modifiers.modal) {
      focusDialog(el)
    }
  },

  updated(el, { value, oldValue, modifiers }, { transition }) {
    if (!value === !oldValue) {
      return
    }

    if (transition) {
      if (value) {
        transition.beforeEnter(el)
        toggleDialog(el, true, modifiers.modal)
        if (modifiers.modal) {
          focusDialog(el)
        }
        transition.enter(el)
        return
      }

      transition.leave(el, () => {
        toggleDialog(el, false, modifiers.modal)
      })
      return
    }

    toggleDialog(el, value, modifiers.modal)
    if (value && modifiers.modal) {
      focusDialog(el)
    }
  },

  beforeUnmount(el, { modifiers }) {
    toggleDialog(el, false, modifiers.modal)
  },
}
