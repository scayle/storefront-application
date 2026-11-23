import { describe, expect, it } from 'vitest'
import type { CMSImageOptions } from '@client/cms/shared/image'
import { optimizeContentfulImage, createContentfulSources } from './media'

describe('optimizeContentfulImage', () => {
  it.for([
    {
      case: 'defaults WebP quality to 80',
      url: 'https://images.ctfassets.net/abc/image.jpg',
      options: { width: 640, format: 'webp' },
      expected: 'https://images.ctfassets.net/abc/image.jpg?w=640&fm=webp&q=80',
    },
    {
      case: 'defaults AVIF quality to 70',
      url: 'https://images.ctfassets.net/abc/image.jpg',
      options: { width: 640, format: 'avif' },
      expected: 'https://images.ctfassets.net/abc/image.jpg?w=640&fm=avif&q=70',
    },
    {
      case: 'defaults JPEG quality to 80',
      url: 'https://images.ctfassets.net/abc/image.jpg',
      options: { width: 375, format: 'jpg' },
      expected: 'https://images.ctfassets.net/abc/image.jpg?w=375&fm=jpg&q=80',
    },
    {
      case: 'normalizes protocol-relative URLs to HTTPS',
      url: '//images.ctfassets.net/abc/image.jpg',
      options: { width: 640, format: 'webp' },
      expected: 'https://images.ctfassets.net/abc/image.jpg?w=640&fm=webp&q=80',
    },
  ] satisfies {
    case: string
    url: string
    options: CMSImageOptions
    expected: string
  }[])('$case', ({ url, options, expected }) => {
    expect(optimizeContentfulImage(url, options)).toBe(expected)
  })
})

// Formats, widths and sizes are tested in shared/image.test.ts. This proves
// the wrapper hands the shared builder the Contentful URL format and the
// viewport fraction.
describe('createContentfulSources', () => {
  it('builds Contentful URLs per format at the widths for the viewport fraction', () => {
    const sources = createContentfulSources(
      '//images.ctfassets.net/abc/hero.jpg',
      0.5,
    )

    expect(
      sources.map(({ type, srcset }) => [type, srcset.split(', ')[0]]),
    ).toEqual([
      [
        'image/avif',
        'https://images.ctfassets.net/abc/hero.jpg?w=640&fm=avif&q=70 640w',
      ],
      [
        'image/webp',
        'https://images.ctfassets.net/abc/hero.jpg?w=640&fm=webp&q=80 640w',
      ],
      [
        'image/jpeg',
        'https://images.ctfassets.net/abc/hero.jpg?w=640&fm=jpg&q=80 640w',
      ],
    ])
  })
})
