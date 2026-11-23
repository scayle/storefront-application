import { afterEach, describe, expect, it, vi } from 'vitest'

const mockUseBreakpoints = vi.hoisted(() => vi.fn())

vi.mock('@vueuse/core', () => ({
  useBreakpoints: (breakpoints: Record<string, string>) => {
    return mockUseBreakpoints(breakpoints)
  },
}))

describe('useDefaultBreakpoints with theme (client)', () => {
  afterEach(() => {
    vi.resetModules()
  })

  // The node test project has no `document`, so this load returns the
  // module's fallback breakpoints. Reading them out of the module (instead of
  // re-declaring them here) keeps the tests passing when a shop changes its
  // Tailwind breakpoints — the composable is the single source of truth.
  async function loadPassedBreakpoints() {
    const { useDefaultBreakpoints } = await import('./useDefaultBreakpoints')
    useDefaultBreakpoints()

    return mockUseBreakpoints.mock.lastCall![0] as Record<string, string>
  }

  it('passes the CSS custom property values to useBreakpoints unchanged', async () => {
    const getPropertyValue = vi.fn((key: string) => {
      const values: Record<string, string> = {
        '--breakpoint-sm': '200px',
        '--breakpoint-md': '30rem',
        '--breakpoint-lg': '400px',
        '--breakpoint-xl': '50rem',
      }
      return values[key] ?? ''
    })
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal(
      'getComputedStyle',
      vi.fn(() => ({ getPropertyValue })),
    )

    const passed = await loadPassedBreakpoints()

    expect(passed).toEqual({
      sm: '200px',
      md: '30rem',
      lg: '400px',
      xl: '50rem',
    })
  })

  it('falls back to the default value when a CSS custom property is empty', async () => {
    const defaultBreakpoints = await loadPassedBreakpoints()

    const getPropertyValue = vi.fn((key: string) =>
      key === '--breakpoint-sm' ? ' 999px ' : '',
    )
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal(
      'getComputedStyle',
      vi.fn(() => ({ getPropertyValue })),
    )

    const passed = await loadPassedBreakpoints()

    expect(passed).toEqual({ ...defaultBreakpoints, sm: '999px' })
  })

  it('keeps a complete breakpoint record when document is unavailable', async () => {
    const passed = await loadPassedBreakpoints()

    expect(Object.entries(passed)).toEqual([
      ['sm', expect.any(String)],
      ['md', expect.any(String)],
      ['lg', expect.any(String)],
      ['xl', expect.any(String)],
    ])
  })
})
