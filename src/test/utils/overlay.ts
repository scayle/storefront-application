import { inject } from 'vue'
import type { App } from 'vue'
import {
  createOverlayPlugin,
  OVERLAY_INJECTION_KEY,
} from '@client/plugins/overlay'
import type { OverlayEntry, OverlayRegistry } from '@client/plugins/overlay'

/**
 * Creates the real overlay plugin for a test mount and exposes the overlays the
 * mounted components create.
 *
 * Components that call `useOverlay()` need the plugin installed. A test that
 * mounts no `SFOverlayHost` reads an overlay's props here instead of through
 * the rendered component, which only exists after an open.
 *
 * @returns The plugin for `global.plugins`, and `entries()` for the overlays
 * created since the mount, in creation order.
 *
 * @example
 * ```ts
 * const overlays = createOverlayTestPlugin()
 * mount(Search, { props, global: { plugins: [overlays.plugin] } })
 * expect(overlays.entries()[0]?.props()).toMatchObject({ hideSorting: true })
 * ```
 */
export function createOverlayTestPlugin() {
  let registry: OverlayRegistry | undefined

  return {
    plugin: {
      install(app: App) {
        app.use(createOverlayPlugin())
        registry = app.runWithContext(() => inject(OVERLAY_INJECTION_KEY))
      },
    },
    entries: (): readonly OverlayEntry[] => registry?.entries ?? [],
  }
}
