import { ContentfulCMSService } from '@scayle/storefront-cms-contentful'
import type { CMSPageMeta } from '@scayle/storefront/cms'
import {
  isTypePageComponent,
  isTypeProductListingPageComponent,
} from '@shared/types/cms/contentful'
import type { CMSPageData } from '@shared/types/cms/contentful'
import type { StorefrontContext } from '@scayle/storefront'
import { z } from 'zod'
import { parseEnv, requiredEnv } from '@server/cms/utils/env'

export { cspConfig } from '@scayle/storefront-cms-contentful'

const contentfulEnvSchema = z.object({
  CONTENTFUL_CMS_ACCESS_TOKEN: requiredEnv,
  CONTENTFUL_CMS_SPACE: requiredEnv,
  CONTENTFUL_CMS_PREVIEW_ACCESS_TOKEN: requiredEnv,
})

/**
 * Validates the Contentful credentials in `process.env`.
 * Called at boot from the server entry and again by `createCMSService()`.
 *
 * @returns The Contentful environment variables
 * @throws Error listing every missing or empty variable
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/contentful
 */
export const parseCmsEnv = () => parseEnv('Contentful', contentfulEnvSchema)

/**
 * Extracts SEO metadata from a Contentful page.
 * Reads tenant-specific field names from the page content schema.
 *
 * @param data Contentful page data
 * @returns SEO metadata or undefined if the page type is not supported
 */
export const getPageMeta = (data: CMSPageData): CMSPageMeta | undefined => {
  const entry = data?.entry

  if (
    !entry?.sys ||
    (!isTypePageComponent(entry) && !isTypeProductListingPageComponent(entry))
  ) {
    return undefined
  }

  if (isTypePageComponent(entry)) {
    const fields = entry.fields as {
      metaTitle?: string
      metaDescription?: string
      robots?: string
      socialShareImage?: { fields?: { file?: { url?: string } } }
    }
    return {
      title: fields.metaTitle,
      description: fields.metaDescription,
      robots: fields.robots,
      image: fields.socialShareImage?.fields?.file?.url ?? undefined,
    }
  }

  return undefined
}

/**
 * Creates the Contentful CMS provider service instance.
 * Validates the environment when called, not when the module is imported, so
 * module import does not throw during test setup.
 *
 * @param storefront Storefront context, used for application-level caching
 * @returns Contentful CMS service
 * @throws Error when a Contentful environment variable is missing or empty
 */
export const createCMSService = (
  storefront: StorefrontContext,
): ContentfulCMSService<CMSPageData> => {
  const env = parseCmsEnv()

  return new ContentfulCMSService<CMSPageData>(
    {
      accessToken: env.CONTENTFUL_CMS_ACCESS_TOKEN,
      space: env.CONTENTFUL_CMS_SPACE,
      previewAccessToken: env.CONTENTFUL_CMS_PREVIEW_ACCESS_TOKEN,
      draftContentEnabled:
        process.env.STOREFRONT_CMS_ALLOW_DRAFTS?.toLowerCase() === 'true',
    },
    storefront,
  )
}
