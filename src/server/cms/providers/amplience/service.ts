import { AmplienceCMSService as BaseAmplienceCMSService } from '@scayle/storefront-cms-amplience'
import type { CMSPageMeta } from '@scayle/storefront/cms'
import type { CMSPageData } from '@shared/types/cms/amplience'
import type { StorefrontContext } from '@scayle/storefront'
import { z } from 'zod'
import { parseEnv, requiredEnv } from '@server/cms/utils/env'

export { cspConfig } from '@scayle/storefront-cms-amplience'

const amplienceEnvSchema = z.object({
  AMPLIENCE_CMS_HUB_NAME: requiredEnv,
})

/**
 * Validates the Amplience credentials in `process.env`.
 * Called at boot from the server entry and again by `createCMSService()`.
 *
 * @returns The Amplience environment variables
 * @throws Error when the hub name is missing or empty
 */
export const parseCmsEnv = () => parseEnv('Amplience', amplienceEnvSchema)

/**
 * Schema URI of the Amplience content type that carries page-level SEO fields.
 * Amplience identifies a content item's type by the schema URI in `_meta.schema`,
 * not by a content-type name, so meta extraction keys off this value.
 */
const PAGE_COMPONENT_SCHEMA_URI =
  'https://scayle.com/schemas/page-component.json'

/**
 * Shape of the Amplience page content item this template's SEO mapping reads.
 * Kept local to the tenant layer because the field names come from the content
 * model in `.scayle/cms/contentModel/amplience/`, which a fork is free to change.
 */
interface AmplienceContentItem {
  _meta?: { schema?: string }
  metaTitle?: string
  metaDescription?: string
  robots?: string
}

/**
 * Extracts SEO metadata from an Amplience page.
 * Reads tenant-specific field names from the page content schema.
 *
 * Only the `page-component` type carries SEO fields. The
 * `product-listing-page-component` type holds teaser and SEO content blocks but
 * no meta fields, so category pages fall back to the storefront's own metadata.
 *
 * @param data Amplience page data
 * @returns SEO metadata, or undefined when the content type carries none
 */
export const getPageMeta = (data: CMSPageData): CMSPageMeta | undefined => {
  const item = data as AmplienceContentItem

  if (item?._meta?.schema !== PAGE_COMPONENT_SCHEMA_URI) {
    return undefined
  }

  return {
    title: typeof item.metaTitle === 'string' ? item.metaTitle : undefined,
    description:
      typeof item.metaDescription === 'string'
        ? item.metaDescription
        : undefined,
    robots: typeof item.robots === 'string' ? item.robots : undefined,
  }
}

// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/amplience
export class AmplienceCMSService extends BaseAmplienceCMSService<CMSPageData> {}

/**
 * Creates the Amplience CMS provider service instance.
 * Validates the environment when called, not when the module is imported, so
 * module import does not throw during test setup.
 *
 * @param storefront Storefront context, used for application-level caching
 * @returns Amplience CMS service
 * @throws Error when `AMPLIENCE_CMS_HUB_NAME` is missing or empty
 */
export const createCMSService = (
  storefront: StorefrontContext,
): AmplienceCMSService => {
  const env = parseCmsEnv()

  return new AmplienceCMSService(
    {
      hubName: env.AMPLIENCE_CMS_HUB_NAME,
      draftContentEnabled:
        process.env.STOREFRONT_CMS_ALLOW_DRAFTS?.toLowerCase() === 'true',
    },
    storefront,
  )
}
