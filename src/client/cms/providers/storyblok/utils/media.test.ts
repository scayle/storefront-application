import { describe, expect, it } from 'vitest'
import { optimizeStoryblokImage, createStoryblokSources } from './media'

const imageUrl = 'https://a.storyblok.com/f/123/hero.jpg'

describe('optimizeStoryblokImage', () => {
  it.for([
    {
      options: { width: 640, format: 'avif' },
      expected: `${imageUrl}/m/640x0/filters:format(avif):quality(80)`,
    },
    {
      options: { width: 375, format: 'jpg' },
      expected: `${imageUrl}/m/375x0/filters:format(jpg):quality(80)`,
    },
  ] as const)('builds $expected', ({ options, expected }) => {
    expect(optimizeStoryblokImage(imageUrl, options)).toBe(expected)
  })
})

describe('createStoryblokSources', () => {
  it('builds every format from Storyblok image service URLs scaled to the viewport fraction', () => {
    // Breakpoint widths and source order are tested once in
    // shared/image.test.ts. This proves the Storyblok transformer is the one
    // wired in and receives the fraction.
    const srcsetFor = (format: string) =>
      [640, 512, 320, 188]
        .map(
          (width) =>
            `${imageUrl}/m/${width}x0/filters:format(${format}):quality(80) ${width}w`,
        )
        .join(', ')

    const sources = createStoryblokSources(imageUrl, 0.5)

    expect(sources.map(({ type, srcset }) => ({ type, srcset }))).toEqual([
      { type: 'image/avif', srcset: srcsetFor('avif') },
      { type: 'image/webp', srcset: srcsetFor('webp') },
      { type: 'image/jpeg', srcset: srcsetFor('jpg') },
    ])
  })
})
