import type { CMSImageOptions, CMSImageSource } from '@client/cms/shared/image'
import { getSources } from '@client/cms/shared/image'

/**
 * Production Dynamic Media host used for published assets. `CmsHead` preconnects
 * to it, so the two have to name the same host.
 */
export const PRODUCTION_MEDIA_HOST = 'cdn.media.amplience.net'

/**
 * Amplience image-link fields the components read.
 * The generated schema types carry extra delivery metadata that is not needed
 * to build a Dynamic Media URL, so this narrows to just those three fields.
 */
export interface AmplienceImageField {
  /** Host from the Amplience content response. Staging hosts are rewritten to the production CDN. */
  defaultHost: string
  /** Dynamic Media endpoint (account) name. */
  endpoint: string
  /** Asset name within the endpoint. */
  name: string
}

/** Amplience video-link fields needed to build a Dynamic Media video URL. */
export type AmplienceVideoField = AmplienceImageField

/**
 * Single transcoded rendition from Amplience video metadata (`/v/...json`).
 *
 * @see https://amplience.com/developers/docs/apis/media-delivery/media-delivery-reference/#video
 */
export interface AmplienceVideoMediaProfile {
  /**
   * Delivery URL from Amplience metadata. Unused when building player sources:
   * `buildAmplienceVideoSourcesFromMetadata` rebuilds URLs from `profile` instead.
   */
  src: string
  /** HTTP-friendly profile name used in the video delivery path. */
  profile: string
  /** Container format from Amplience, for example `mpeg4` or `webm`. */
  format?: string
  /** Used to order sources highest-first. */
  bitrate?: string
  width?: string
  height?: string
}

/**
 * Amplience Dynamic Media video metadata payload.
 *
 * Returned by `GET /v/{endpoint}/{name}.json`. The `media` array lists every
 * transcode profile that was applied to the asset.
 */
export interface AmplienceVideoMetadata {
  media?: AmplienceVideoMediaProfile[]
}

/** HTML5 `<source>` descriptor built from Amplience metadata. */
export interface AmplienceVideoSource {
  /** Profiled Dynamic Media video URL. */
  src: string
  /** MIME type for the `<source type>` attribute. */
  type: string
}

/**
 * Resolves the media host for Dynamic Media URLs.
 *
 * VSE content responses set `defaultHost` to the staging domain, but browser media
 * requests cannot attach VSE authorization headers. Published assets are served from
 * the production CDN, so staging hosts are rewritten for preview and visualization.
 *
 * @param defaultHost Host from the Amplience media-link object
 * @returns Hostname to use when building the media URL
 */
export const resolveAmplienceMediaHost = (defaultHost: string): string => {
  if (defaultHost.includes('staging.bigcontent.io')) {
    return PRODUCTION_MEDIA_HOST
  }

  return defaultHost
}

/**
 * Serializes an Amplience image link into the flat URL that `getSources`
 * transforms per breakpoint.
 *
 * `getSources` is shared across providers and works on a single URL string,
 * while Amplience delivers an image as an object of host, endpoint, and name.
 * Encoding those three into the URL up front lets Amplience reuse the shared
 * breakpoint and format logic unchanged.
 *
 * The host goes through `resolveAmplienceMediaHost` like the `<img>` fallback
 * does. A `<picture>` never falls back from a failing `<source>` to its `<img>`,
 * so leaving the staging host on the source candidates would show nothing at all
 * in preview on any browser that negotiates AVIF or WebP.
 *
 * @param image Amplience image link
 * @returns Dynamic Media base URL with no transform parameters
 */
export const toAmplienceImageUrl = (image: AmplienceImageField): string => {
  const host = resolveAmplienceMediaHost(image.defaultHost)

  return `https://${host}/i/${image.endpoint}/${image.name}`
}

/**
 * Applies Dynamic Media transform parameters to an Amplience image URL.
 *
 * Amplience negotiates the output format through `fmt`, so the format each
 * `<source>` requests maps straight onto that parameter. `jpg` is passed as
 * `jpeg`, the spelling Dynamic Media expects.
 *
 * @param sourceUrl Amplience Dynamic Media base URL
 * @param options Optimization options for this source candidate
 * @returns URL with width and format parameters applied
 *
 * @see https://amplience.com/developers/docs/apis/dynamic-media/
 */
export const optimizeAmplienceImage = (
  sourceUrl: string,
  options: CMSImageOptions,
): string => {
  const [base] = sourceUrl.split('?')
  const format = options.format === 'jpg' ? 'jpeg' : options.format
  const params = new URLSearchParams({
    w: String(options.width),
    fmt: format,
    qlt: 'default',
  })

  return `${base}?${params.toString()}`
}

/**
 * Creates Amplience responsive sources for a single image link.
 *
 * @param image Amplience image link
 * @param viewportFraction Fraction of viewport width the image occupies
 * @returns Responsive source entries for AVIF, WebP, and JPEG
 */
export const createAmplienceSources = (
  image: AmplienceImageField,
  viewportFraction: number,
): CMSImageSource[] => {
  return getSources(
    toAmplienceImageUrl(image),
    viewportFraction,
    optimizeAmplienceImage,
  )
}

/**
 * Builds the plain `src` fallback for an Amplience image.
 * Used as the `<img src>` behind the responsive `<source>` candidates, so it
 * negotiates the format through `fmt=auto` rather than pinning one.
 *
 * @param image Amplience image link
 * @param width Optional target width
 * @returns Dynamic Media URL with automatic format and default quality
 */
export const buildAmplienceFallbackSrc = (
  image: AmplienceImageField,
  width?: number,
): string => {
  const params = new URLSearchParams({ fmt: 'auto', qlt: 'default' })

  if (width !== undefined) {
    params.set('w', String(width))
  }

  return `${toAmplienceImageUrl(image)}?${params.toString()}`
}

/**
 * Builds a Dynamic Media URL for an Amplience video link.
 *
 * Without a profile, Amplience returns the video's poster frame (or the first
 * frame), not a playable stream. Profiled URLs append `protocol=https` so the
 * stream is served over HTTPS on HTTPS pages.
 *
 * @param video Amplience video link
 * @param profile Optional transcode profile name (for example `mp4_720p`)
 * @returns Poster-frame URL, or a profiled video stream URL
 *
 * @see https://amplience.com/developers/docs/apis/media-delivery/media-delivery-reference/#video
 */
export const buildAmplienceVideoUrl = (
  video: AmplienceVideoField,
  profile?: string,
): string => {
  const host = resolveAmplienceMediaHost(video.defaultHost)
  const base = `https://${host}/v/${video.endpoint}/${video.name}`

  return profile ? `${base}/${profile}?protocol=https` : base
}

/**
 * Builds the Amplience video metadata URL for a video link.
 *
 * The `.json` response lists every transcode profile applied to the asset.
 *
 * @param video Amplience video link
 * @returns Full HTTPS URL for the video metadata document
 */
export const buildAmplienceVideoMetadataUrl = (
  video: AmplienceVideoField,
): string => {
  const host = resolveAmplienceMediaHost(video.defaultHost)

  return `https://${host}/v/${video.endpoint}/${video.name}.json`
}

/**
 * Maps an Amplience video container format to an HTML5 MIME type.
 *
 * @param format Format from metadata (`mpeg4`, `webm`, …)
 * @returns MIME type for a `<source type>` attribute
 */
const resolveVideoMimeType = (format?: string): string => {
  // `mpeg4` and `mp4` fall into the default: MP4 is the fallback container.
  return format?.toLowerCase() === 'webm' ? 'video/webm' : 'video/mp4'
}

/**
 * Builds `<source>` entries from Amplience video metadata.
 *
 * Uses the profiles Amplience actually applied to the asset, ordered by bitrate
 * (highest first). Delivery URLs are rebuilt with HTTPS + `protocol=https`
 * instead of reusing the often-`http` `src` values from the metadata payload.
 *
 * @param video Amplience video link
 * @param metadata Metadata payload from `/v/{endpoint}/{name}.json`
 * @returns Source descriptors for an HTML5 `<video>` element
 */
export const buildAmplienceVideoSourcesFromMetadata = (
  video: AmplienceVideoField,
  metadata: AmplienceVideoMetadata,
): AmplienceVideoSource[] => {
  // `bitrate` comes from an external JSON payload, so a non-numeric value would make
  // the comparator return NaN and leave the source order unspecified.
  const toBitrate = (profile: AmplienceVideoMediaProfile) =>
    Number.parseFloat(profile.bitrate ?? '') || 0

  return [...(metadata.media ?? [])]
    .filter((item) => Boolean(item.profile))
    .sort((a, b) => toBitrate(b) - toBitrate(a))
    .map((item) => ({
      src: buildAmplienceVideoUrl(video, item.profile),
      type: resolveVideoMimeType(item.format),
    }))
}
