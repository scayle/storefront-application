import { defineComponent, h } from 'vue'
import { useCMSContext } from '@client/cms/shared/useCMSContext'

/**
 * Stub for a provider's block dispatch component that reads the viewport
 * context its parent provides and renders both fractions as attributes.
 *
 * Every CMS provider has its own grid and dispatch component, but they all
 * propagate context through `useCMSContext`, so each provider's grid test
 * passes this probe as the stub for its own `*BlockDispatch` to assert what a
 * nested media block would receive.
 */
export const CMSViewportProbe = defineComponent({
  setup() {
    const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

    return () =>
      h('div', {
        'data-testid': 'probe',
        'data-desktop': desktopViewportFraction.value,
        'data-mobile': mobileViewportFraction.value,
      })
  },
})
