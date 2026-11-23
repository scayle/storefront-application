import type { App, Component, InjectionKey } from 'vue'
import { shallowReactive } from 'vue'

/**
 * One overlay created through `useOverlay().create()`, as `SFOverlayHost`
 * renders it.
 */
export interface OverlayEntry {
  /**
   * Id the host passes to the overlay component, so it lands on the element a
   * trigger's `aria-controls` points at.
   */
  readonly id: string
  /**
   * The overlay's component, or `null` until its first open has loaded it. The
   * host renders only entries that have a component, and keeps rendering them
   * after they close so they keep their state.
   */
  component: Component | null
  /** Whether the overlay is open. Bound to the component's `open` model. */
  isOpen: boolean
  /**
   * Returns the props for the component. Read during the host's render, so
   * reactive values read inside it update the open overlay.
   */
  readonly props: () => Record<string, unknown>
  /**
   * Closes the overlay. The host calls it when the component emits `close` or
   * sets its `open` model to `false`.
   */
  readonly close: () => void
}

/**
 * Holds the overlays of one app instance, shared by `useOverlay()` and
 * `SFOverlayHost`.
 */
export interface OverlayRegistry {
  /** Every overlay created in this app and not yet disposed, in creation order. */
  readonly entries: readonly OverlayEntry[]
  /** Adds an overlay for the host to render. */
  add: (entry: OverlayEntry) => void
  /** Removes an overlay, which unmounts its component if it was rendered. */
  remove: (entry: OverlayEntry) => void
  /** Returns an id that is unique within this app. */
  createId: () => string
}

/** Injection key for the overlay registry. Read it through `useOverlay()`. */
export const OVERLAY_INJECTION_KEY: InjectionKey<OverlayRegistry> =
  Symbol('overlay')

/**
 * Creates the Vue plugin that holds the app's overlays.
 *
 * Install it in both entries (`main.ts`, `ssr.ts`) and render `SFOverlayHost`
 * next to the Inertia `App`. Each app instance gets its own registry, so a
 * server render never sees another request's overlays.
 *
 * @returns The plugin to pass to `app.use()`.
 */
export function createOverlayPlugin(): { install: (app: App) => void } {
  return {
    install(app: App) {
      const entries = shallowReactive<OverlayEntry[]>([])
      let lastId = 0

      app.provide(OVERLAY_INJECTION_KEY, {
        entries,
        add: (entry) => {
          entries.push(entry)
        },
        remove: (entry) => {
          const index = entries.indexOf(entry)
          if (index !== -1) {
            entries.splice(index, 1)
          }
        },
        createId: () => `overlay-${++lastId}`,
      })
    },
  }
}
