// Deliberately just the *querying* primitives, not focus traps or focus restoration:
// `useReturnFocus` covers restoring focus to a captured trigger, and the APG select-only
// combobox (`SFDropdown`) tracks its active option via `aria-activedescendant` rather than
// querying focusables at all, so neither is folded in here.

/**
 * Selector for the natural tab stops inside a subtree. Excludes
 * `tabindex="-1"` so queries land on real focusable elements, never on
 * programmatic focus sentinels (e.g. a slider heading or dialog root).
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Reports whether an element is currently rendered and hit-testable.
 *
 * `offsetParent === null` catches `display: none` on the element or any
 * ancestor; the `position: fixed` branch covers elements the offsetParent
 * check misses (sticky CTAs, cookie banners) that are still on screen.
 */
function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent !== null) {
    return true
  }
  return (
    getComputedStyle(el).position === 'fixed' && el.getClientRects().length > 0
  )
}

/**
 * Returns the first focusable descendant of `container`, or `null` when
 * `container` is missing or contains no focusable element.
 */
export function getFirstFocusable(
  container: Element | null | undefined,
): HTMLElement | null {
  return container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? null
}

/**
 * Returns the first visible focusable element that follows `region` in
 * document order and lies outside it, or `null` when none exists. Inert during
 * SSR (returns `null`).
 *
 * The search stops at the enclosing `<dialog>` when there is one: `showModal()`
 * makes everything outside the dialog inert, where `.focus()` is a no-op, so a
 * document-wide match would leave focus where it was.
 */
export function getFirstFocusableAfter(
  region: Element | null | undefined,
): HTMLElement | null {
  if (import.meta.env.SSR || !region) {
    return null
  }
  const searchRoot = region.closest('dialog') ?? document
  const candidates = [
    ...searchRoot.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ]
  for (const el of candidates) {
    const position = region.compareDocumentPosition(el)
    const follows = Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)
    if (follows && !region.contains(el) && isVisible(el)) {
      return el
    }
  }
  return null
}
