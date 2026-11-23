import { Inertia } from '@scayle/storefront'
import { BaseCMSPageController } from '@scayle/storefront/controllers'
import {
  buildCmsHreflangs,
  generateOnlineStoreSchema,
  mapCmsPageMeta,
} from '@server/utils/seo'
import { DEFAULT_LOGO_PATH, HOMEPAGE_SLUG } from '@server/cms/constants'
import { getPageMeta } from '@cms-server/service'
import type { CMSPageData } from '@cms-shared'
import type { CMSPageViewData } from '@scayle/storefront/controllers'
import type { Components, Props } from '@scayle/storefront'

/**
 * Shared tenant base for the CMS page routes. Extends the SDK base controller
 * for the fetch and not-found lifecycle, and composes the tenant Inertia
 * props: eager `pageData`, `meta` derived from the CMS entry, and server-only
 * `hreflangs`. Subclasses only choose the slug (and page path where it differs
 * from `/${slug}`).
 */
abstract class CmsPageController extends BaseCMSPageController<
  'CmsPage',
  CMSPageData
> {
  protected override getTemplate(_pageData: CMSPageData): 'CmsPage' {
    return 'CmsPage'
  }

  /**
   * Returns the page path used for hreflang alternate links.
   *
   * Defaults to `/${slug}`. Overridden by the homepage controller, where the
   * slug is a CMS constant but the page lives at `/`.
   *
   * @param slug The CMS slug the page was fetched for
   * @returns The absolute path (without origin) of the page
   */
  protected getPagePath(slug: string): string {
    return `/${slug}`
  }

  protected override getViewProps({
    pageData,
    slug,
  }: CMSPageViewData<CMSPageData>): Props<Components['CmsPage']> {
    const request = this.request

    return {
      pageData,
      slug,
      /** SEO metadata derived from the CMS page entry. */
      meta: async () =>
        mapCmsPageMeta({
          cmsMeta: getPageMeta(pageData),
          shopName: await this.services.shopConfig.getShopName(),
          pageUrl: request.url.href,
        }),
      hreflangs: Inertia.serverOnly(() =>
        buildCmsHreflangs({
          pagePath: this.getPagePath(slug),
          storefront: this.storefront,
          origin: request.origin,
          alternatePagePaths: this.services.cms.getAlternatePaths?.(pageData),
        }),
      ),
    }
  }
}

/**
 * CMS homepage controller for `/` and `/homepage`.
 *
 * Fetches the fixed homepage slug, emits hreflangs for `/`, and adds the
 * OnlineStore JSON-LD.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms
 */
export class CmsHomepageController extends CmsPageController {
  protected override getSlug(): string {
    return HOMEPAGE_SLUG
  }

  protected override getPagePath(_slug: string): string {
    return '/'
  }

  protected override getViewProps(
    data: CMSPageViewData<CMSPageData>,
  ): Props<Components['CmsPage']> {
    const origin = this.request.origin

    return {
      ...super.getViewProps(data),
      /** OnlineStore for crawlers, which read only the server-rendered HTML. Absent when the shop configuration could not be read. */
      jsonLd: Inertia.serverOnly(async () =>
        generateOnlineStoreSchema({
          name: await this.services.shopConfig.getShopName(),
          url: origin,
          logo: `${origin}${DEFAULT_LOGO_PATH}`,
        }),
      ),
    }
  }
}

/**
 * CMS content page controller for `/content/:slug`.
 *
 * Fetches the `content/`-prefixed slug from the route param.
 */
export class CmsContentController extends CmsPageController {
  protected override getSlug(): string | undefined {
    const slug = this.ctx.req.param('slug')

    // Hono decodes percent-encoded characters in route params, so a single
    // `:slug` segment can carry a literal `/` or dot-segment that would reach
    // the CMS provider as a path traversal, steering the request to a different
    // API resource. The route serves plain single-segment slugs only; anything
    // else is a 404.
    if (!slug || slug.includes('/') || slug === '.' || slug === '..') {
      return undefined
    }

    return `content/${slug}`
  }
}
