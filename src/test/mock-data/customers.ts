import type { Customer } from '@scayle/storefront/types'

/**
 * Creates a mock signed-in `Customer` with a password login, with the fields
 * `CustomerMapperService` maps. The personal data fields the customer has not
 * filled in are `undefined`. `idHash` is a placeholder, not the SHA-256 of `id`
 * the mapper derives, so a test that reads both sets both.
 *
 * @param overrides Customer fields merged over the defaults.
 * @returns A complete customer.
 */
export function createMockCustomer(
  overrides: Partial<Customer> = {},
): Customer {
  return {
    id: 12345,
    idHash: 'customer-id-hash',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: undefined,
    gender: undefined,
    title: undefined,
    isGuest: false,
    authentication: { type: 'password' },
    groups: [],
    segments: [],
    ...overrides,
  }
}
