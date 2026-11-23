import { describe, expect, it } from 'vitest'
import type { CMSImageOptions } from './image'
import { getSources } from './image'

const optimize = (url: string, { width, format }: CMSImageOptions) =>
  `${url}?w=${width}&f=${format}`

describe('getSources', () => {
  it('requests each source in the format its MIME type names', () => {
    const sources = getSources('img.jpg', 1, optimize)

    expect(
      sources.map(({ type, srcset }) => [type, srcset.split(', ')[0]]),
    ).toEqual([
      ['image/avif', 'img.jpg?w=1280&f=avif 1280w'],
      ['image/webp', 'img.jpg?w=1280&f=webp 1280w'],
      ['image/jpeg', 'img.jpg?w=1280&f=jpg 1280w'],
    ])
  })

  it.for([
    {
      case: 'full viewport',
      fraction: 1,
      srcset:
        'img.jpg?w=1280&f=avif 1280w, img.jpg?w=1024&f=avif 1024w, img.jpg?w=640&f=avif 640w, img.jpg?w=375&f=avif 375w',
    },
    {
      case: 'half viewport',
      fraction: 0.5,
      srcset:
        'img.jpg?w=640&f=avif 640w, img.jpg?w=512&f=avif 512w, img.jpg?w=320&f=avif 320w, img.jpg?w=188&f=avif 188w',
    },
    {
      case: 'zero viewport fraction, clamped to a width of 1',
      fraction: 0,
      srcset:
        'img.jpg?w=1&f=avif 1w, img.jpg?w=1&f=avif 1w, img.jpg?w=1&f=avif 1w, img.jpg?w=1&f=avif 1w',
    },
  ])('builds the srcset widths for $case', ({ fraction, srcset }) => {
    expect(getSources('img.jpg', fraction, optimize)[0]!.srcset).toBe(srcset)
  })

  it('builds sizes attribute from breakpoints with container padding subtracted', () => {
    const sources = getSources('img.jpg', 1, optimize)
    const { sizes } = sources[0]!

    // 968px at 1024px proves the desktop padding (56px) applies at the lg
    // threshold; the mobile padding (32px) would yield 992px.
    expect(sizes).toBe(
      '(min-width: 1280px) 1224px, (min-width: 1024px) 968px, (min-width: 640px) 608px, 343px',
    )
  })

  it('builds sizes attribute scaled by viewport fraction', () => {
    const sources = getSources('img.jpg', 0.5, optimize)
    const { sizes } = sources[0]!

    expect(sizes).toBe(
      '(min-width: 1280px) 612px, (min-width: 1024px) 484px, (min-width: 640px) 304px, 172px',
    )
  })
})
