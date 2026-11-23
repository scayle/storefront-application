import { StoryblokCMSService as BaseStoryblokCMSService } from '@scayle/storefront-cms-storyblok'
import type { CMSPageMeta } from '@scayle/storefront/cms'
import type { CMSPageData } from '@shared/types/cms/storyblok'
import type { StorefrontContext } from '@scayle/storefront'
import { z } from 'zod'
import { parseEnv, requiredEnv } from '@server/cms/utils/env'

export { cspConfig } from '@scayle/storefront-cms-storyblok'

const storyblokEnvSchema = z.object({
  STORYBLOK_CMS_ACCESS_TOKEN: requiredEnv,
})

/**
 * Validates the Storyblok credentials in `process.env`.
 * Called at boot from the server entry and again by `createCMSService()`.
 *
 * @returns The Storyblok environment variables
 * @throws Error when the access token is missing or empty
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/storyblok
 */
export const parseCmsEnv = () => parseEnv('Storyblok', storyblokEnvSchema)

/**
 * Extracts SEO metadata from a Storyblok page.
 * Reads tenant-specific field names from the page content schema.
 *
 * @param data Storyblok page data
 * @returns SEO metadata or undefined if the page type is not supported
 */
export const getPageMeta = (data: CMSPageData): CMSPageMeta | undefined => {
  const content = data?.story?.content

  if (
    !content ||
    (content.component !== 'PageComponent' &&
      content.component !== 'ProductListingPageComponent')
  ) {
    return undefined
  }

  return {
    title:
      typeof content.metaTitle === 'string' ? content.metaTitle : undefined,
    description:
      typeof content.metaDescription === 'string'
        ? content.metaDescription
        : undefined,
    robots: typeof content.robots === 'string' ? content.robots : undefined,
    image:
      content.socialShareImage &&
      typeof content.socialShareImage === 'object' &&
      'filename' in content.socialShareImage
        ? (content.socialShareImage as { filename?: string }).filename
        : undefined,
  }
}

/**
 * Creates the Storyblok CMS provider service instance.
 * Validates the environment when called, not when the module is imported, so
 * module import does not throw during test setup.
 *
 * @param storefront Storefront context, used for application-level caching
 * @returns Storyblok CMS service
 * @throws Error when `STORYBLOK_CMS_ACCESS_TOKEN` is missing or empty
 */
export const createCMSService = (
  storefront: StorefrontContext,
): BaseStoryblokCMSService<CMSPageData> => {
  const env = parseCmsEnv()

  return new BaseStoryblokCMSService<CMSPageData>(
    {
      accessToken: env.STORYBLOK_CMS_ACCESS_TOKEN,
      folderMapping: {
        de: 'de',
        en: 'en',
      },
      draftContentEnabled:
        process.env.STOREFRONT_CMS_ALLOW_DRAFTS?.toLowerCase() === 'true',
    },
    storefront,
  )
}
