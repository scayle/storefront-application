import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, reactive, ref } from 'vue'
import { createUserCentricsAdapterPlugin } from './userCentricsAdapter'
import type {
  DataProcessingService,
  UsercentricsConsentDetail,
  UsercentricsConsentEvent,
} from './userCentricsAdapter'
import type { ConsentManagerPlugin } from './consentManager'

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  listeners: [] as { event: string; handler: (event: never) => void }[],
  consentManager: null as ConsentManagerPlugin | null,
}))

vi.mock('@scayle/storefront/shared', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@scayle/storefront/shared')>()
  return {
    ...actual,
    createLogger: () => ({ error: mocks.error, debug: vi.fn() }),
  }
})

// The adapter listens on `window` through the VueUse default target; the stub
// records the handler so tests dispatch `UC_CONSENT` by hand.
vi.mock('@vueuse/core', () => ({
  useEventListener: (event: string, handler: (event: never) => void) => {
    mocks.listeners.push({ event, handler })
  },
}))

vi.mock('./consentManager', () => ({
  getConsentManagerInstance: () => mocks.consentManager,
}))

/** The consent manager's own `openConsentManager`, which the adapter replaces. */
const withoutCmp = () => {}

function createConsentManager(
  consentManagementRequired = true,
): ConsentManagerPlugin {
  return {
    state: reactive<Record<string, boolean>>({}),
    openConsentManager: withoutCmp,
    consentManagementRequired,
    consentId: ref<string | undefined>(undefined),
    cmpPending: ref(false),
  }
}

function consentEvent(
  services: Record<string, boolean>,
  controllerId = 'controller-1',
): UsercentricsConsentEvent {
  return {
    detail: {
      services: Object.fromEntries(
        Object.entries(services).map(([vendorId, given]) => [
          vendorId,
          { consent: { given } } as DataProcessingService,
        ]),
      ),
      consent: { controllerId } as UsercentricsConsentDetail,
    },
  }
}

function install() {
  createUserCentricsAdapterPlugin().install(createApp({ template: '<div />' }))
}

/** Dispatches a consent event to the handler the adapter registered. */
function emitConsent(event: UsercentricsConsentEvent) {
  const listener = mocks.listeners.find((entry) => entry.event === 'UC_CONSENT')
  if (!listener) {
    throw new Error('UC_CONSENT listener was not registered')
  }
  listener.handler(event as never)
}

describe('createUserCentricsAdapterPlugin', () => {
  let consentManager: ConsentManagerPlugin

  beforeEach(() => {
    mocks.listeners = []
    consentManager = createConsentManager()
    mocks.consentManager = consentManager
    vi.stubGlobal('window', { UC_UI: { showFirstLayer: vi.fn() } })
  })

  it('fails loudly when the consent manager plugin was not installed first', () => {
    mocks.consentManager = null

    expect(() => install()).toThrow(
      'install createConsentManagerPlugin before userCentricsAdapter',
    )
  })

  it('stays inert in a country that does not require consent management', () => {
    mocks.consentManager = createConsentManager(false)

    install()

    expect(mocks.listeners).toHaveLength(0)
    expect(mocks.consentManager.openConsentManager).toBe(withoutCmp)
    expect(mocks.consentManager.cmpPending.value).toBe(false)
  })

  it('maps the consent of every reported service into the consent state', () => {
    install()

    emitConsent(consentEvent({ 'vendor-a': true, 'vendor-b': false }))

    expect(consentManager.state).toEqual({
      'vendor-a': true,
      'vendor-b': false,
    })
  })

  it('applies a later consent change to the state it already holds', () => {
    install()
    emitConsent(consentEvent({ 'vendor-a': false, 'vendor-b': false }))

    emitConsent(consentEvent({ 'vendor-a': true }))

    expect(consentManager.state).toEqual({
      'vendor-a': true,
      'vendor-b': false,
    })
  })

  it('copies the Usercentrics controller id onto the consent manager', () => {
    install()

    emitConsent(consentEvent({ 'vendor-a': true }, 'controller-42'))

    expect(consentManager.consentId.value).toBe('controller-42')
  })

  it('opens the Usercentrics first layer through the consent manager', () => {
    const showFirstLayer = vi.fn()
    vi.stubGlobal('window', { UC_UI: { showFirstLayer } })
    install()

    consentManager.openConsentManager()

    expect(showFirstLayer).toHaveBeenCalledOnce()
  })

  it('logs instead of throwing when the Usercentrics script has not loaded', () => {
    vi.stubGlobal('window', {})
    install()

    consentManager.openConsentManager()

    expect(mocks.error).toHaveBeenCalledExactlyOnceWith({
      message: 'Usercentrics is not available',
    })
  })

  describe('CMP loading signal', () => {
    /** Resolves the promise chain the install-time read runs on. */
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

    it('reports the CMP as loading until it has said anything', () => {
      install()

      expect(consentManager.cmpPending.value).toBe(true)
    })

    it('clears the signal with the consent event that reports state and id', () => {
      install()

      emitConsent(consentEvent({ 'vendor-a': true }, 'controller-7'))

      expect(consentManager.cmpPending.value).toBe(false)
    })

    it('clears the signal on the initial report of a visitor who has not decided yet', () => {
      // Usercentrics dispatches `UC_CONSENT` when it initializes, with nothing
      // granted for a first-time visitor. That is a report, so the wait ends.
      install()

      emitConsent(consentEvent({ 'vendor-a': false }))

      expect(consentManager.cmpPending.value).toBe(false)
      expect(consentManager.state).toEqual({ 'vendor-a': false })
    })

    it('reads the stored record back when Usercentrics initialized before the plugin', async () => {
      // The initial `UC_CONSENT` fired before the listener existed, so only
      // the API read can end the wait.
      const getConsentDetails = vi
        .fn()
        .mockResolvedValue(
          consentEvent({ 'vendor-a': true }, 'controller-9').detail,
        )
      vi.stubGlobal('window', {
        __ucCmp: { isInitialized: () => true, getConsentDetails },
      })

      install()
      await settle()

      expect(consentManager.cmpPending.value).toBe(false)
      expect(consentManager.state).toEqual({ 'vendor-a': true })
      expect(consentManager.consentId.value).toBe('controller-9')
    })

    it('accepts a promise from isInitialized', async () => {
      const getConsentDetails = vi
        .fn()
        .mockResolvedValue(consentEvent({ 'vendor-a': true }).detail)
      vi.stubGlobal('window', {
        __ucCmp: {
          isInitialized: () => Promise.resolve(true),
          getConsentDetails,
        },
      })

      install()
      await settle()

      expect(consentManager.cmpPending.value).toBe(false)
    })

    it('keeps waiting for the event while Usercentrics has not initialized', async () => {
      const getConsentDetails = vi.fn()
      vi.stubGlobal('window', {
        __ucCmp: { isInitialized: () => false, getConsentDetails },
      })

      install()
      await settle()

      expect(consentManager.cmpPending.value).toBe(true)
      expect(getConsentDetails).not.toHaveBeenCalled()
    })

    it('keeps waiting for the event when a stored-record read fails', async () => {
      vi.stubGlobal('window', {
        __ucCmp: {
          isInitialized: () => true,
          getConsentDetails: () => Promise.reject(new Error('not ready')),
        },
      })

      install()
      await settle()

      expect(consentManager.cmpPending.value).toBe(true)
    })
  })
})
