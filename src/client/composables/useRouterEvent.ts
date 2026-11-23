import type {
  GlobalEvent,
  GlobalEventNames,
  GlobalEventResult,
} from '@inertiajs/core'
import { router } from '@inertiajs/vue3'
import { onUnmounted } from 'vue'

/**
 * Listens for router events and executes a callback when the event is triggered.
 * The listener is automatically removed when the component is unmounted.
 *
 * Generic over the event name so the callback receives that event's own detail
 * (e.g. `before` carries the pending visit) instead of the union of all of them.
 *
 * @param event - The router event to listen for.
 * @param callback - The callback to execute when the event is triggered.
 */
export function useRouterEvent<TEventName extends GlobalEventNames>(
  event: TEventName,
  callback: (event: GlobalEvent<TEventName>) => GlobalEventResult<TEventName>,
): void {
  const removeListener = router.on(event, callback)
  onUnmounted(() => {
    removeListener()
  })
}
