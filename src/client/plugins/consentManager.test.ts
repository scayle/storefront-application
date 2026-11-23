import { describe, expect, it, vi } from 'vitest'
import { createApp, inject, isRef, nextTick, watch } from 'vue'

const mocks = vi.hoisted(() => ({ debug: vi.fn() }))

vi.mock('@scayle/storefront/shared', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@scayle/storefront/shared')>()
  return { ...actual, createLogger: () => ({ debug: mocks.debug }) }
})

/**
 * The plugin keeps its instance in module state so CMP adapters can reach it
 * without an app context, so every test loads the module fresh.
 */
async function loadModule() {
  vi.resetModules()
  return import('./consentManager')
}

async function install(consentManagementRequired = true) {
  const module = await loadModule()
  const app = createApp({ template: '<div />' })

  module
    .createConsentManagerPlugin()
    .install(app, { consentManagementRequired })

  const plugin = app.runWithContext(() =>
    inject(module.CONSENT_MANAGER_INJECTION_KEY),
  )

  return { module, plugin }
}

describe('createConsentManagerPlugin', () => {
  it('reports no instance before the plugin is installed', async () => {
    const { getConsentManagerInstance } = await loadModule()

    expect(getConsentManagerInstance()).toBeNull()
  })

  it('provides the initial consent state a CMP adapter starts from', async () => {
    const { plugin } = await install(true)

    expect(plugin!.state).toEqual({})
    expect(plugin!.consentId.value).toBeUndefined()
    expect(plugin!.consentManagementRequired).toBe(true)

    // The requirement comes from the active country, passed through the
    // install options.
    expect((await install(false)).plugin!.consentManagementRequired).toBe(false)
  })

  it('reports no CMP wait until an adapter asks for one', async () => {
    const { plugin } = await install()

    // The default is what keeps a fork with a custom adapter on the old
    // behavior: no wait means SCAYLE Analytics drops before consent instead
    // of holding events forever.
    expect(isRef(plugin!.cmpPending)).toBe(true)
    expect(plugin!.cmpPending.value).toBe(false)
  })

  it('hands the provided instance to adapter plugins', async () => {
    const { module, plugin } = await install()

    expect(module.getConsentManagerInstance()).toBe(plugin)
  })

  it('notifies watchers when an adapter writes a vendor consent', async () => {
    const { plugin } = await install()
    const seen: (boolean | undefined)[] = []
    watch(
      () => plugin!.state['usercentrics-vendor'],
      (given) => seen.push(given),
    )

    plugin!.state['usercentrics-vendor'] = true
    await nextTick()

    expect(seen).toEqual([true])
  })

  it('logs instead of opening a UI while no CMP adapter has taken over', async () => {
    const { plugin } = await install()

    plugin!.openConsentManager()

    expect(mocks.debug).toHaveBeenCalledExactlyOnceWith({
      message: 'No consent manager is available',
    })
  })
})
