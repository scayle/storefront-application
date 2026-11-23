import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isReadonly } from 'vue'

describe('usePageMeta', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('SSR', false)
  })

  it('exposes a reactive currentTitle ref that starts empty', async () => {
    const { usePageMeta } = await import('./usePageMeta')
    const { currentTitle } = usePageMeta()

    expect(currentTitle.value).toBe('')
  })

  it('shares the title set through one call with every other call (module-level singleton)', async () => {
    const { usePageMeta } = await import('./usePageMeta')

    const first = usePageMeta()
    const second = usePageMeta()

    first.setCurrentTitle('Home')
    expect(second.currentTitle.value).toBe('Home')
  })

  it('returns currentTitle read-only, so writes go through the guarded setter', async () => {
    const { usePageMeta } = await import('./usePageMeta')

    expect(isReadonly(usePageMeta().currentTitle)).toBe(true)
  })

  // The state is a module singleton shared by every request an SSR process
  // handles, so a server-render write would outlive the request.
  it('ignores writes during a server render', async () => {
    vi.stubEnv('SSR', true)
    const { usePageMeta } = await import('./usePageMeta')
    const { currentTitle, setCurrentTitle } = usePageMeta()

    setCurrentTitle('Home')

    expect(currentTitle.value).toBe('')
  })
})
