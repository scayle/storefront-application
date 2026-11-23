import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

/**
 * A handler for a keyboard key press after normalization.
 *
 * Receives the original `KeyboardEvent` so handlers can call `preventDefault()` or inspect modifiers.
 */
export type KeydownAction = (event: KeyboardEvent) => void

/**
 * Map of normalized key names to handlers.
 *
 * Keys use normalized names like `'down'`, `'enter'`, `'escape'` (see {@link DEFAULT_KEY_ALIASES}).
 * Bind the handler returned by `useKeydownActions()` to an element's `@keydown` event.
 */
export type KeydownActions = Record<string, KeydownAction>

/**
 * Default `event.key` → normalized-name aliases shared by every consumer. Any
 * key not listed falls back to `event.key.toLowerCase()` (so e.g. `PageUp`
 * becomes `pageup`, letters stay themselves). Merge extra entries via the
 * `aliases` option.
 */
export const DEFAULT_KEY_ALIASES: Readonly<Record<string, string>> = {
  ' ': 'space',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Home: 'home',
  End: 'end',
  Enter: 'enter',
  Escape: 'escape',
  Tab: 'tab',
}

/**
 * Configuration for keyboard event dispatching and normalization.
 *
 * Controls whether matched keys should prevent their browser defaults and stop propagation,
 * plus custom `event.key` aliases for domain-specific key names.
 */
export interface UseKeydownActionsOptions {
  /**
   * Call `event.preventDefault()` when an action matched. Defaults to `true`.
   * Unmatched keys are never touched, so browser defaults (Tab, page scroll)
   * are preserved.
   */
  preventDefault?: boolean
  /**
   * Call `event.stopPropagation()` when an action matched. Defaults to `false`.
   * Set `true` for nested widgets whose parent also listens on `@keydown`
   * (e.g. a dot rail inside a carousel that must not double-handle arrows).
   */
  stopPropagation?: boolean
  /** Extra `event.key` → normalized-name aliases, merged over {@link DEFAULT_KEY_ALIASES}. */
  aliases?: Record<string, string>
}

/**
 * Builds a `keydown` handler that normalizes `event.key` and dispatches to a
 * per-key action map — the mechanical scaffolding shared by the design-system's
 * keyboard-driven widgets (comboboxes, sliders, carousels, roving-tabindex
 * rails). It owns ONLY normalization + dispatch + the `preventDefault` /
 * `stopPropagation` policy. Navigation semantics (wrap-around, roving focus,
 * step sizes, open/close state, two-step Escape) stay in the consumer.
 *
 * Unmatched keys fall through untouched — no `preventDefault` — so unrelated
 * keys keep their browser behavior.
 *
 * `actions` may be a plain object, a ref, or a getter, so a consumer can swap
 * the active map (e.g. `() => isOpen.value ? openActions : closedActions`); it
 * is resolved on every event.
 *
 * @param actions Map of normalized key name → handler (or a ref/getter of one).
 * @param options Dispatch policy and extra aliases.
 * @returns A `(event: KeyboardEvent) => void` handler to bind via `@keydown`.
 *
 * @example
 * ```ts
 * const onKeydown = useKeydownActions({
 *   down: (e) => { e.preventDefault(); next() },
 *   up: (e) => { e.preventDefault(); prev() },
 *   escape: () => close(),
 * })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/accessibility
 */
export function useKeydownActions(
  actions: MaybeRefOrGetter<KeydownActions>,
  options: UseKeydownActionsOptions = {},
): KeydownAction {
  const { preventDefault = true, stopPropagation = false, aliases } = options
  const aliasMap = aliases
    ? { ...DEFAULT_KEY_ALIASES, ...aliases }
    : DEFAULT_KEY_ALIASES

  const normalizeKey = (event: KeyboardEvent): string =>
    aliasMap[event.key] ?? event.key.toLowerCase()

  return (event: KeyboardEvent) => {
    const action = toValue(actions)[normalizeKey(event)]
    if (!action) {
      return
    }
    if (preventDefault) {
      event.preventDefault()
    }
    if (stopPropagation) {
      event.stopPropagation()
    }
    action(event)
  }
}
