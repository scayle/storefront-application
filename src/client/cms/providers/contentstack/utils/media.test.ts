import { describe, expect, it } from 'vitest'
import { optimizeContentstackImage, createContentstackSources } from './media'

describe('optimizeContentstackImage', () => {
  it.for([
    {
      case: 'builds the width, format and default quality params',
      options: { width: 640, format: 'avif' },
      expected:
        'https://images.contentstack.io/abc/image.jpg?width=640&auto=avif&quality=80',
    },
    {
      case: 'defaults JPEG quality to 80',
      options: { width: 375, format: 'jpg' },
      expected:
        'https://images.contentstack.io/abc/image.jpg?width=375&auto=jpg&quality=80',
    },
  ] as const)('$case', ({ options, expected }) => {
    expect(
      optimizeContentstackImage(
        'https://images.contentstack.io/abc/image.jpg',
        options,
      ),
    ).toBe(expected)
  })
})

describe('createContentstackSources', () => {
  // Breakpoints, sizes and the source order are tested in
  // `shared/image.test.ts`; this proves the wrapper hands the viewport
  // fraction and the Contentstack URL builder to the shared helper.
  it('builds Contentstack URLs per format at the widths for the viewport fraction', () => {
    const sources = createContentstackSources(
      'https://images.contentstack.io/abc/hero.jpg',
      0.5,
    )

    expect(
      sources.map(({ type, srcset }) => [type, srcset.split(', ')[0]]),
    ).toEqual([
      [
        'image/avif',
        'https://images.contentstack.io/abc/hero.jpg?width=640&auto=avif&quality=80 640w',
      ],
      [
        'image/webp',
        'https://images.contentstack.io/abc/hero.jpg?width=640&auto=webp&quality=80 640w',
      ],
      [
        'image/jpeg',
        'https://images.contentstack.io/abc/hero.jpg?width=640&auto=jpg&quality=80 640w',
      ],
    ])
  })
})
