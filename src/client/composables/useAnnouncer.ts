import { ref } from 'vue'
import type { Ref } from 'vue'

/**
 * Urgency level for live-region announcements.
 *
 * `assertive` interrupts the current screen-reader utterance (use for errors, failures, deliberate navigations).
 * `polite` waits for the current utterance to finish (use for routine updates, result counts, confirmations).
 */
export type Politeness = 'polite' | 'assertive'

/**
 * Shared coalescing window (ms) for debounced announcements. Rapid interactions
 * (filter toggles, repeated quantity changes, successive removals) collapse to a
 * single announcement once the dust settles, keeping AT behavior predictable and
 * consistent across flows. Pass it as `announce(msg, { debounce: ANNOUNCE_DEBOUNCE_MS })`.
 */
export const ANNOUNCE_DEBOUNCE_MS = 300

/**
 * How long an announced message stays mounted before it is pruned. The AT
 * captures the text the instant the node is appended, so the later removal is
 * silent and only keeps the regions from growing unbounded.
 */
const MESSAGE_TTL_MS = 1000

/**
 * A single queued announcement awaiting rendering in a live region.
 *
 * Each message receives a unique `id` so every DOM insertion is a distinct childList mutation,
 * reliably triggering re-announcement across NVDA, JAWS, and VoiceOver (even for identical text).
 */
export interface AnnouncerMessage {
  /** Unique identifier keying the rendered node. */
  id: number
  /** Text content to announce. */
  text: string
}

/**
 * Options for controlling announcement behavior.
 *
 * Supports live-region urgency selection and debouncing for rapid updates.
 */
export interface AnnounceOptions {
  /**
   * Live-region urgency. Defaults to `polite`, which waits for the screen reader
   * to finish its current utterance — correct for routine updates (result counts,
   * status, confirmations). `assertive` INTERRUPTS whatever is being read, so
   * reserve it for messages worth cutting the user off for: errors/failures and
   * deliberate navigations. Using it for routine updates is disruptive.
   */
  politeness?: Politeness
  /**
   * Coalescing window in milliseconds. Rapid calls within the window collapse to
   * the last message. Omitted = announce immediately.
   *
   * NOTE: the debounce timer is keyed by `politeness`, not by caller — it is
   * last-call-wins across the whole app. If two components debounce on the same
   * politeness level within the window, the later call cancels the earlier one's
   * pending timer and the earlier message is dropped (never announced). No caller
   * collides today, but `SFFilterActions` and `SFProductSlider` both debounce on
   * `polite`. If you need guaranteed delivery from a specific source, debounce in
   * the caller (e.g. `useDebounceFn`) and call `announce` without this option.
   */
  debounce?: number
}

// Module-level singleton: one polite + one assertive message queue shared across
// the whole app and rendered once by `<SFLiveAnnouncer>`. A single source of
// truth and a single pair of live regions in the document — consumers call
// `announce()` instead of wiring their own region.
//
// INVARIANT — client-only: because this state lives at module scope, in SSR it
// is shared across every request the Node process handles, not per app instance.
// The `import.meta.env.SSR` guard in `announce()` is the ONLY thing keeping a
// stray server-side call from mutating these queues and bleeding one request's
// message into another request's render. Nothing else enforces it: never write
// to these refs (or call `announce`/`writeMessage`) outside that guard.
const politeMessages = ref<AnnouncerMessage[]>([])
const assertiveMessages = ref<AnnouncerMessage[]>([])

const queues: Record<Politeness, Ref<AnnouncerMessage[]>> = {
  polite: politeMessages,
  assertive: assertiveMessages,
}

const debounceTimers: Record<
  Politeness,
  ReturnType<typeof setTimeout> | undefined
> = {
  polite: undefined,
  assertive: undefined,
}

let nextId = 0

// Append each message as a fresh child node (mirrors react-aria's
// `LiveAnnouncer`) instead of mutating one text node. A `childList` insertion is
// the most reliably announced live-region change across NVDA, JAWS and
// VoiceOver: NVDA misses a plain text-node swap, and emptying-then-refilling
// stops VoiceOver from announcing. Because every call is a new node, identical
// consecutive messages re-announce on their own. The node is pruned once the AT
// has read it.
const writeMessage = (politeness: Politeness, message: string) => {
  const queue = queues[politeness]
  const id = nextId++
  queue.value = [...queue.value, { id, text: message }]
  setTimeout(() => {
    queue.value = queue.value.filter((entry) => entry.id !== id)
  }, MESSAGE_TTL_MS)
}

const announce = (message: string, options: AnnounceOptions = {}) => {
  // Announcements are client-only side effects; never run during SSR render.
  if (import.meta.env.SSR) {
    return
  }

  const politeness = options.politeness ?? 'polite'
  clearTimeout(debounceTimers[politeness])

  if (options.debounce) {
    debounceTimers[politeness] = setTimeout(
      writeMessage,
      options.debounce,
      politeness,
      message,
    )
    return
  }

  writeMessage(politeness, message)
}

const clear = (politeness?: Politeness) => {
  // Client-only, like `announce` — keep every writer behind the SSR guard so the
  // module-shared queues are never mutated during a server render.
  if (import.meta.env.SSR) {
    return
  }

  const targets: Politeness[] = politeness
    ? [politeness]
    : ['polite', 'assertive']
  for (const target of targets) {
    clearTimeout(debounceTimers[target])
    queues[target].value = []
  }
}

/**
 * Imperative screen-reader announcements through a single shared pair of live
 * regions (rendered once by `<SFLiveAnnouncer>`). Modeled on react-aria's
 * `LiveAnnouncer`: call `announce(message)` from anywhere instead of declaring
 * a local `ref` + `sr-only` region and re-implementing the re-announce trick.
 *
 * Pass **already-translated** strings (resolve i18n at the call site). Each call
 * appends a fresh node to the matching region (so identical consecutive messages
 * still re-announce, reliably across NVDA/JAWS/VoiceOver) and prunes it shortly
 * after. SSR-inert.
 *
 * Use this for transient, imperative announcements (route changes, toggle
 * outcomes, submit progress, filter results, toasts). For a message that is
 * content bound to a specific element (a field error, a low-stock badge), keep
 * an inline live region instead.
 *
 * @returns `announce(message, options)`, `clear(politeness?)`, and the two
 *   reactive message queues (consumed by `<SFLiveAnnouncer>`).
 *
 * @example
 * ```ts
 * const { announce } = useAnnouncer()
 * announce(t('wishlist_toggle.a11y.removed_announcement', { name }))
 * announce(t('notification.error.network_error'), { politeness: 'assertive' })
 * announce(t('filter_actions.show_results_with_count', count), { debounce: ANNOUNCE_DEBOUNCE_MS })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/accessibility
 */
export function useAnnouncer() {
  return { announce, clear, politeMessages, assertiveMessages }
}
