import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConsent } from './useConsent'

const warnMock = vi.hoisted(() => vi.fn())

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ warn: warnMock }),
}))

const mocks = {
  consentManager: {
    state: {} as Record<string, boolean>,
    openConsentManager: vi.fn(),
    consentManagementRequired: true,
  },
}

vi.mock('./useConsentManager', () => ({
  useConsentManager: () => mocks.consentManager,
}))

vi.mock('@client/consent-vendor.config.json', () => ({
  default: {
    paypal: 'paypal-id',
    'google-analytics': 'analytics-id',
    'google-tag-manager': 'gtm-id',
  },
}))

describe('useConsent', () => {
  describe('when consent management is not required', () => {
    it('returns consent as true', () => {
      mocks.consentManager.consentManagementRequired = false

      const result = useConsent('paypal')

      expect(result.consent.value).toBe(true)
    })

    it('returns no-op openConsentManager', async () => {
      mocks.consentManager.consentManagementRequired = false

      const result = useConsent('paypal')

      await expect(result.openConsentManager()).resolves.toBeUndefined()
    })
  })

  describe('when consent management is required', () => {
    beforeEach(() => {
      mocks.consentManager.consentManagementRequired = true
      mocks.consentManager.state = {}
    })

    const consentCases: {
      name: string
      state: Record<string, boolean>
      expectedConsent: boolean
    }[] = [
      { name: 'no consent', state: {}, expectedConsent: false },
      {
        name: 'vendor has consent',
        state: { 'paypal-id': true },
        expectedConsent: true,
      },
      {
        name: 'vendor consent is explicitly false',
        state: { 'paypal-id': false },
        expectedConsent: false,
      },
    ]

    it.each(consentCases)(
      'returns consent as $expectedConsent when vendor has $name',
      ({ state, expectedConsent }) => {
        mocks.consentManager.state = state

        const result = useConsent('paypal')

        expect(result.consent.value).toBe(expectedConsent)
      },
    )

    it('calls openConsentManager from consent manager', () => {
      const result = useConsent('paypal')

      result.openConsentManager()

      expect(mocks.consentManager.openConsentManager).toHaveBeenCalled()
    })
  })

  describe('vendor configuration', () => {
    beforeEach(() => {
      mocks.consentManager.consentManagementRequired = true
      mocks.consentManager.state = {}
    })

    it('maps different vendors correctly', () => {
      mocks.consentManager.state = {
        'analytics-id': true,
        'gtm-id': true,
      }

      const googleAnalytics = useConsent('google-analytics')
      const gtm = useConsent('google-tag-manager')

      expect(googleAnalytics.consent.value).toBe(true)
      expect(gtm.consent.value).toBe(true)
    })

    it('warns for a vendor missing from the vendor configuration', () => {
      useConsent('unknown-vendor' as Parameters<typeof useConsent>[0])

      expect(warnMock).toHaveBeenCalledWith({
        message: 'Consent vendor not configured',
        vendor: 'unknown-vendor',
      })
    })

    it('does not warn for known vendors', () => {
      useConsent('paypal')

      expect(warnMock).not.toHaveBeenCalled()
    })
  })
})
