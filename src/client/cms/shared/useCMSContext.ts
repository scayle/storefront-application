import { inject, provide, ref } from 'vue'
import type { Ref } from 'vue'

const CMS_CONTEXT_KEY = Symbol('cms.context')

/**
 * CMS viewport context shared across nested CMS blocks.
 * Used by grid-like containers to help image components compute responsive sources.
 */
export interface CMSContext {
  /** Viewport fraction available on desktop layouts. */
  desktopViewportFraction: Ref<number>
  /** Viewport fraction available on mobile layouts. */
  mobileViewportFraction: Ref<number>
}

/**
 * Provides the viewport fraction for nested CMS blocks.
 * Used by container components such as Grid to propagate layout context.
 *
 * @param context Partial viewport context merged into the parent context
 *
 * @example
 * ```ts
 * provideCMSContext({
 *   desktopViewportFraction: computed(() => 0.5),
 *   mobileViewportFraction: computed(() => 1),
 * })
 * ```
 *
 * @see https://vuejs.org/guide/components/provide-inject.html
 */
export function provideCMSContext(context: Partial<CMSContext>): void {
  const parentContext = useCMSContext()
  provide(CMS_CONTEXT_KEY, {
    desktopViewportFraction:
      context.desktopViewportFraction ?? parentContext.desktopViewportFraction,
    mobileViewportFraction:
      context.mobileViewportFraction ?? parentContext.mobileViewportFraction,
  })
}

/**
 * Reads the viewport fraction from parent CMS containers.
 * Used by media blocks to create responsive sizes and srcset.
 *
 * @returns CMS viewport context, defaults to full width
 *
 * @example
 * ```ts
 * const { desktopViewportFraction } = useCMSContext()
 * ```
 */
export function useCMSContext(): CMSContext {
  return inject(CMS_CONTEXT_KEY, {
    desktopViewportFraction: ref(1),
    mobileViewportFraction: ref(1),
  })
}
