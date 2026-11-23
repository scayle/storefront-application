import type { MapperRegistry, StorefrontContext } from '@scayle/storefront'
import { createMockMapperRegistry as createSdkMockMapperRegistry } from '@scayle/storefront/test'
import type { PartialMembers } from '@scayle/storefront/test'
import { ServerI18nService } from '@server/services/i18n'

/**
 * Re-exports the storefront context, country, session, per-request context,
 * render context, service registry, and cache doubles from
 * `@scayle/storefront/test`, where they live so the SDK and every project share
 * one set of defaults.
 *
 * Kept as a barrel so the server test files keep one import path and a future
 * move of the doubles is a single edit here. New tests may import from
 * `@scayle/storefront/test` directly.
 */
export {
  createContext,
  createMockCache,
  createMockIncomingRequest,
  createMockRequestContext,
  createMockServiceRegistry,
  createMockSession,
  createMockSSRRenderContext,
  createMockStorefrontContext,
  createMockStorefrontCountry,
} from '@scayle/storefront/test'
export type { MockStorefrontContextOverrides } from '@scayle/storefront/test'

/**
 * Builds a mapper registry for code under test that resolves mappers.
 *
 * Wraps `createMockMapperRegistry` from `@scayle/storefront/test` and fills
 * `i18n` with a real {@link ServerI18nService}, which is application code the SDK
 * must not depend on. Assertions therefore see actual translations rather than a
 * `vi.fn()` stub. Almost every server test path needs it, because the mappers
 * under test read the slot instead of building their own translator. Pass
 * `overrides` for any further slot the code under test reads (`product`,
 * `category`, `promotion`, …); every other slot is an auto-mock.
 *
 * @param storefront Storefront context the mappers take their locale and country from.
 * @param overrides Registry slots to use instead of the defaults, each holding only the methods the test exercises.
 * @returns A mapper registry with a real `i18n` slot plus the given overrides.
 */
export function createMockMapperRegistry(
  storefront: StorefrontContext,
  overrides: PartialMembers<MapperRegistry> = {},
): MapperRegistry {
  return createSdkMockMapperRegistry({
    i18n: new ServerI18nService(storefront),
    ...overrides,
  })
}
