import type { UseBreakpointReturn } from '@vueuse/core'
import { useBreakpoints } from '@vueuse/core'

const BREAKPOINT_KEYS = ['sm', 'md', 'lg', 'xl'] as const
type BreakpointKey = (typeof BREAKPOINT_KEYS)[number]

const DEFAULT_BREAKPOINTS: Record<BreakpointKey, string> = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
}

/**
 * Reads breakpoint values from Tailwind theme (CSS custom properties on :root).
 * Values stay CSS lengths (e.g. `64rem`), so `matchMedia` resolves rem against the
 * current browser font size, the same way the Tailwind `lg:` variants do.
 * Falls back to these values during SSR. Keep in sync with design-tokens.css.
 *
 * @see https://tailwindcss.com/docs/theme#referencing-in-javascript
 *
 * @returns The breakpoints as a record of key-value pairs.
 */
function getBreakpointsFromTheme(): Record<BreakpointKey, string> {
  if (typeof document === 'undefined') {
    return DEFAULT_BREAKPOINTS
  }

  const style = getComputedStyle(document.documentElement)
  const breakpoints = {} as Record<BreakpointKey, string>

  for (const key of BREAKPOINT_KEYS) {
    const value = style.getPropertyValue(`--breakpoint-${key}`).trim()
    breakpoints[key] = value || DEFAULT_BREAKPOINTS[key]
  }

  return breakpoints
}

/**
 * Returns a configured breakpoints composable.
 * Uses breakpoints from the Tailwind theme (design-tokens.css @theme static).
 *
 * @returns VueUse `useBreakpoints` composable with configured breakpoint values
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const breakpoints = useDefaultBreakpoints()
 * const isMobile = breakpoints.smaller('lg')
 * const isDesktop = breakpoints.greater('lg')
 * </script>
 * ```
 *
 * @see https://vueuse.org/core/useBreakpoints/
 */
export function useDefaultBreakpoints(): UseBreakpointReturn<BreakpointKey> {
  return useBreakpoints(getBreakpointsFromTheme())
}
