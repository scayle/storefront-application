<template>
  <!--
    The single pair of live regions for the whole app, driven by `useAnnouncer`.
    Mount once near the app root. Consumers call `announce(...)` instead of
    declaring their own region. `aria-live` is set explicitly (not relying on the
    implicit value of `role`) because VoiceOver/NVDA do not reliably honor the
    implicit live semantics for dynamically updated regions. Each message is a
    separate child node (appended, then pruned) — a `childList` insertion is the
    most reliably announced change across AT, and `aria-atomic` is intentionally
    omitted so only the newly added node is read, not the whole region.
  -->
  <div
    v-bind="$attrs"
    role="status"
    aria-live="polite"
    class="sr-only"
    data-testid="live-announcer-polite"
  >
    <div v-for="message in politeMessages" :key="message.id">
      {{ message.text }}
    </div>
  </div>
  <div
    role="alert"
    aria-live="assertive"
    class="sr-only"
    data-testid="live-announcer-assertive"
  >
    <div v-for="message in assertiveMessages" :key="message.id">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAnnouncer } from '@client/composables/useAnnouncer'

// Two root regions; this component never receives fallthrough attributes.
defineOptions({ inheritAttrs: false })

// Intentionally no `clear()` on unmount: the queues are a shared singleton
// rendered by every mounted instance at once (this one plus one inside each open
// `SFSlideIn`/`SFModal`), so clearing here would let a closing dialog wipe
// announcements the surviving instances still owe.
const { politeMessages, assertiveMessages } = useAnnouncer()
</script>
