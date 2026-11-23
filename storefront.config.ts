import { defineStorefrontConfig } from '@scayle/storefront/config'
import type { CountrySelector } from '@scayle/storefront/config'
import { routes } from '@shared/routes'
import pkg from './package.json' with { type: 'json' }

declare module '@scayle/storefront/config' {
  export interface PublicConfigFields {
    userCentricsAppId: string
    gtmId: string
  }
  export interface PublicCountryFields {
    consentManagementRequired: boolean
    subscriptionEnabled: boolean
  }
}

const countrySelector = (process.env.STOREFRONT_COUNTRY_SELECTOR ??
  'path') as CountrySelector

// See https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/configuration for every option and
// https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/environment-variables for the variables it reads.
export default defineStorefrontConfig({
  tenantSpace: process.env.STOREFRONT_TENANT_SPACE!,
  shopKey: process.env.STOREFRONT_SHOP_KEY!,
  version: pkg.version,
  // Narrowed here because the countries below carry `path:`; switching to
  // `'domain'` requires reshaping `countries` to use `domain:` instead.
  countrySelector: countrySelector as Exclude<CountrySelector, 'domain'>,
  storefrontApiKey: process.env.STOREFRONT_API_KEY!,
  oauth: {
    clientId: process.env.STOREFRONT_OAUTH_CLIENT_ID!,
    clientSecret: process.env.STOREFRONT_OAUTH_CLIENT_SECRET!,
  },
  publicFields: {
    gtmId: process.env.STOREFRONT_GTM_ID!,
    userCentricsAppId: process.env.STOREFRONT_USER_CENTRICS_APP_ID!,
  },
  // Pins the public host every absolute URL is built from. Leave it unset to
  // use the forwarded host of the incoming request, which is what local
  // development wants.
  domain: process.env.STOREFRONT_DOMAIN || undefined,
  // Cacheable routes - session storage I/O is skipped for these routes
  // Keys are route patterns, values are cache TTL in seconds.
  // Patterns reference @shared/routes so cache matching cannot drift from the mounted routes.
  cacheableRoutes: {
    [routes.home]: 600,
    [routes.homepage]: 600,
    [routes.productDetail]: 600,
    [routes.productListing]: 600,
    [routes.search]: 600,
    [routes.content]: 600,
  },
  countries: [
    {
      name: 'Germany',
      currency: {
        currencyCode: 'EUR',
      },
      locale: 'de-DE',
      shopCountryId: Number(
        process.env.STOREFRONT_COUNTRIES_DE_SHOP_COUNTRY_ID,
      ),
      countryCode: 'DE',
      path: 'de',
      isDefault: true,
      checkout: {
        user: process.env.STOREFRONT_COUNTRIES_DE_CHECKOUT_USER!,
        token: process.env.STOREFRONT_COUNTRIES_DE_CHECKOUT_TOKEN!,
        secret: process.env.STOREFRONT_COUNTRIES_DE_CHECKOUT_SECRET!,
      },
      publicFields: {
        consentManagementRequired: true,
        subscriptionEnabled:
          process.env.STOREFRONT_COUNTRIES_DE_SUBSCRIPTION_ENABLED?.toLowerCase() ===
          'true',
      },
    },
    {
      name: 'United States',
      currency: {
        currencyCode: 'USD',
      },
      locale: 'en-US',
      path: 'en',
      shopCountryId: Number(
        process.env.STOREFRONT_COUNTRIES_US_SHOP_COUNTRY_ID,
      ),
      countryCode: 'US',
      checkout: {
        user: process.env.STOREFRONT_COUNTRIES_US_CHECKOUT_USER!,
        token: process.env.STOREFRONT_COUNTRIES_US_CHECKOUT_TOKEN!,
        secret: process.env.STOREFRONT_COUNTRIES_US_CHECKOUT_SECRET!,
      },
      publicFields: {
        consentManagementRequired: true,
        subscriptionEnabled:
          process.env.STOREFRONT_COUNTRIES_US_SUBSCRIPTION_ENABLED?.toLowerCase() ===
          'true',
      },
    },
    {
      name: 'Austria',
      currency: {
        currencyCode: 'EUR',
      },
      locale: 'de-AT',
      path: 'at',
      shopCountryId: Number(
        process.env.STOREFRONT_COUNTRIES_AT_SHOP_COUNTRY_ID,
      ),
      countryCode: 'AT',
      checkout: {
        user: process.env.STOREFRONT_COUNTRIES_AT_CHECKOUT_USER!,
        token: process.env.STOREFRONT_COUNTRIES_AT_CHECKOUT_TOKEN!,
        secret: process.env.STOREFRONT_COUNTRIES_AT_CHECKOUT_SECRET!,
      },
      publicFields: {
        consentManagementRequired: true,
        subscriptionEnabled:
          process.env.STOREFRONT_COUNTRIES_AT_SUBSCRIPTION_ENABLED?.toLowerCase() ===
          'true',
      },
    },
  ],
  session: {
    ttl: 60 * 60 * 24 * 30, // 30 days
    secret: process.env.STOREFRONT_SESSION_SECRET!,
  },
})
