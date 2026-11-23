import { describe, expect, it } from 'vitest'
import {
  buildAmplienceFallbackSrc,
  buildAmplienceVideoMetadataUrl,
  buildAmplienceVideoSourcesFromMetadata,
  buildAmplienceVideoUrl,
  createAmplienceSources,
  optimizeAmplienceImage,
  PRODUCTION_MEDIA_HOST,
  resolveAmplienceMediaHost,
  toAmplienceImageUrl,
} from './media'

const image = {
  defaultHost: 'cdn.media.amplience.net',
  endpoint: 'scayle',
  name: 'hero',
}

describe('toAmplienceImageUrl', () => {
  it('assembles host, endpoint, and name into a Dynamic Media path', () => {
    expect(toAmplienceImageUrl(image)).toBe(
      'https://cdn.media.amplience.net/i/scayle/hero',
    )
  })
})

describe('resolveAmplienceMediaHost', () => {
  it.for([
    {
      host: 'abc.staging.bigcontent.io',
      expected: PRODUCTION_MEDIA_HOST,
    },
    { host: 'media.example.com', expected: 'media.example.com' },
  ])('resolves $host to $expected', ({ host, expected }) => {
    expect(resolveAmplienceMediaHost(host)).toBe(expected)
  })
})

// Browser media requests cannot carry the visual editor's authorization, so
// every builder that addresses an asset has to route its host through the
// rewrite, or preview shows broken media.
describe('staging host rewrite', () => {
  it.for([
    { builder: 'toAmplienceImageUrl', build: toAmplienceImageUrl },
    { builder: 'buildAmplienceVideoUrl', build: buildAmplienceVideoUrl },
    {
      builder: 'buildAmplienceVideoMetadataUrl',
      build: buildAmplienceVideoMetadataUrl,
    },
  ])('$builder serves a staging asset from the production CDN', ({ build }) => {
    const url = build({ ...image, defaultHost: 'abc.staging.bigcontent.io' })

    expect(new URL(url).host).toBe(PRODUCTION_MEDIA_HOST)
  })
})

describe('optimizeAmplienceImage', () => {
  it.for([
    {
      reason: 'applies width and format as Dynamic Media parameters',
      options: { width: 800, format: 'webp' },
      expected: 'https://cdn.example/i/e/n?w=800&fmt=webp&qlt=default',
    },
    {
      reason: 'translates jpg to the jpeg spelling Dynamic Media expects',
      options: { width: 400, format: 'jpg' },
      expected: 'https://cdn.example/i/e/n?w=400&fmt=jpeg&qlt=default',
    },
    {
      reason: 'passes avif through unchanged',
      options: { width: 400, format: 'avif' },
      expected: 'https://cdn.example/i/e/n?w=400&fmt=avif&qlt=default',
    },
  ] as const)('$reason', ({ options, expected }) => {
    expect(optimizeAmplienceImage('https://cdn.example/i/e/n', options)).toBe(
      expected,
    )
  })

  it('replaces existing parameters rather than appending a second query string', () => {
    const result = optimizeAmplienceImage(
      'https://cdn.example/i/e/n?w=100&fmt=auto',
      { width: 800, format: 'webp' },
    )

    expect(result.match(/\?/g)).toHaveLength(1)
    expect(result).toContain('w=800')
    expect(result).not.toContain('w=100')
  })
})

describe('createAmplienceSources', () => {
  it('produces one entry per format, each with an Amplience srcset', () => {
    const sources = createAmplienceSources(image, 1)

    expect(sources.map((source) => source.type)).toEqual([
      'image/avif',
      'image/webp',
      'image/jpeg',
    ])
    expect(sources[0]?.srcset).toContain('fmt=avif')
  })

  it('scales requested widths by the viewport fraction of a grid cell', () => {
    const [full] = createAmplienceSources(image, 1)
    const [half] = createAmplienceSources(image, 0.5)

    expect(full?.srcset).toContain('w=1280')
    expect(half?.srcset).toContain('w=640')
  })
})

describe('buildAmplienceFallbackSrc', () => {
  it('defaults to automatic format and default quality', () => {
    expect(buildAmplienceFallbackSrc(image)).toBe(
      'https://cdn.media.amplience.net/i/scayle/hero?fmt=auto&qlt=default',
    )
  })

  it('applies a width when one is given', () => {
    expect(buildAmplienceFallbackSrc(image, 600)).toContain('w=600')
  })
})

describe('buildAmplienceVideoUrl', () => {
  it('returns the poster-frame URL when no profile is given', () => {
    expect(buildAmplienceVideoUrl(image)).toBe(
      'https://cdn.media.amplience.net/v/scayle/hero',
    )
  })

  it('appends protocol=https to a profiled stream, for HTTPS pages', () => {
    expect(buildAmplienceVideoUrl(image, 'mp4_720p')).toBe(
      'https://cdn.media.amplience.net/v/scayle/hero/mp4_720p?protocol=https',
    )
  })
})

describe('buildAmplienceVideoMetadataUrl', () => {
  it('points at the .json document listing the applied profiles', () => {
    expect(buildAmplienceVideoMetadataUrl(image)).toBe(
      'https://cdn.media.amplience.net/v/scayle/hero.json',
    )
  })
})

/* eslint-disable sonarjs/no-clear-text-protocols -- Amplience video metadata really returns http:// delivery URLs. These fixtures reproduce that, and these tests assert we rebuild them over HTTPS rather than trusting them. */
describe('buildAmplienceVideoSourcesFromMetadata', () => {
  it('orders sources by bitrate, highest first, so the browser prefers the best rendition', () => {
    const sources = buildAmplienceVideoSourcesFromMetadata(image, {
      media: [
        {
          src: 'http://low',
          profile: 'mp4_480p',
          format: 'mpeg4',
          bitrate: '800',
        },
        {
          src: 'http://high',
          profile: 'mp4_1080p',
          format: 'mpeg4',
          bitrate: '4000',
        },
        {
          src: 'http://mid',
          profile: 'webm_720p',
          format: 'webm',
          bitrate: '2000',
        },
      ],
    })

    expect(sources).toEqual([
      {
        src: 'https://cdn.media.amplience.net/v/scayle/hero/mp4_1080p?protocol=https',
        type: 'video/mp4',
      },
      {
        src: 'https://cdn.media.amplience.net/v/scayle/hero/webm_720p?protocol=https',
        type: 'video/webm',
      },
      {
        src: 'https://cdn.media.amplience.net/v/scayle/hero/mp4_480p?protocol=https',
        type: 'video/mp4',
      },
    ])
  })

  it('treats a non-numeric bitrate as lowest instead of leaving the order undefined', () => {
    const sources = buildAmplienceVideoSourcesFromMetadata(image, {
      media: [
        { src: 'http://odd', profile: 'mp4_480p', bitrate: 'not-a-number' },
        { src: 'http://high', profile: 'mp4_1080p', bitrate: '4000' },
      ],
    })

    expect(sources.map(({ src }) => src)).toEqual([
      'https://cdn.media.amplience.net/v/scayle/hero/mp4_1080p?protocol=https',
      'https://cdn.media.amplience.net/v/scayle/hero/mp4_480p?protocol=https',
    ])
  })

  it('rebuilds URLs over HTTPS rather than reusing the http src from metadata', () => {
    const [source] = buildAmplienceVideoSourcesFromMetadata(image, {
      media: [{ src: 'http://insecure.example/video', profile: 'mp4_720p' }],
    })

    expect(source?.src).toBe(
      'https://cdn.media.amplience.net/v/scayle/hero/mp4_720p?protocol=https',
    )
  })

  it('skips renditions without a profile, which cannot be addressed', () => {
    expect(
      buildAmplienceVideoSourcesFromMetadata(image, {
        media: [{ src: 'http://x', profile: '' }],
      }),
    ).toEqual([])
  })

  it('returns nothing when the payload carries no media array', () => {
    expect(buildAmplienceVideoSourcesFromMetadata(image, {})).toEqual([])
  })
})
/* eslint-enable sonarjs/no-clear-text-protocols */
