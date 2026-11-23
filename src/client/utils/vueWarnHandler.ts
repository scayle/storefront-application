import type { ComponentPublicInstance } from 'vue'
import type { createLogger } from '@scayle/storefront/shared'

/**
 * Creates a Vue `app.config.warnHandler` that silences one known-harmless
 * warning and logs every other warning through the given logger.
 *
 * `vite-plugin-vue-inspector` (via `vueDevTools` in `vite.config.ts`) tags every
 * template node with `data-v-inspector` for click-to-open-in-editor. Inertia's
 * `Deferred` always renders a `Fragment` root, so Vue cannot fall through that
 * attribute onto it. Dev-only noise with no functional effect.
 *
 * @param log Logger to forward unfiltered warnings to
 * @returns A function matching Vue's `app.config.warnHandler` signature
 */
export function createVueWarnHandler(log: ReturnType<typeof createLogger>) {
  return (
    msg: string,
    _instance: ComponentPublicInstance | null,
    trace: string,
  ) => {
    const isDeferredInspectorWarning =
      msg.includes('Extraneous non-props attributes') &&
      msg.includes('data-v-inspector') &&
      trace.includes('Deferred')

    if (isDeferredInspectorWarning) {
      return
    }
    log.warn({ message: 'Vue warning', msg, trace })
  }
}
