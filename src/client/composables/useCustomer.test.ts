import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type { Customer } from '@scayle/storefront/types'
import { useCustomer } from './useCustomer'

const props = reactive<{ customer?: Customer | null }>({})

vi.mock('@client/composables/usePage', () => ({
  usePage: () => ({ props }),
}))

const vipSegment = { id: 'segment-guid', name: 'VIP', referenceKey: 'vip' }

const createCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 12345,
  idHash: 'customer-id-hash',
  email: 'jane.doe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  birthDate: undefined,
  gender: undefined,
  title: undefined,
  isGuest: false,
  groups: [],
  segments: [],
  ...overrides,
})

// A session written before `Customer` carried segments.
const legacyCustomer = {
  ...createCustomer(),
  segments: undefined,
} as unknown as Customer

describe('useCustomer', () => {
  it.for([
    ['the customer prop resolves', undefined, undefined, undefined],
    ['the user is not logged in', null, [], false],
    ['the customer is in no segment', createCustomer(), [], false],
    ['the session customer has no segment list', legacyCustomer, [], false],
    [
      'the customer is in the segment',
      createCustomer({ segments: [vipSegment] }),
      [vipSegment],
      true,
    ],
    [
      'the customer is in another segment',
      createCustomer({
        segments: [{ ...vipSegment, referenceKey: 'fifty-plus' }],
      }),
      [{ ...vipSegment, referenceKey: 'fifty-plus' }],
      false,
    ],
  ] as const)(
    'returns the segments and membership when %s',
    ([, customer, expectedSegments, expectedInSegment]) => {
      props.customer = customer
      const { segments, isInSegment } = useCustomer()

      expect(segments.value).toEqual(expectedSegments)
      expect(isInSegment('vip')).toBe(expectedInSegment)
    },
  )
})
