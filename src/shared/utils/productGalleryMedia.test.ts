import { describe, expect, it } from 'vitest'
import type { ProductImage, ProductVideo } from '@scayle/storefront/types'
import {
  buildGalleryTilePresets,
  buildGalleryTileRowSizes,
  buildProductGalleryMedia,
  partitionGalleryRows,
} from './productGalleryMedia'

const image = (url: string, applyPadding = false): ProductImage => ({
  url,
  name: `${url}.jpg`,
  applyPadding,
})

const video = (url: string, posterUrl?: string): ProductVideo => ({
  url,
  ...(posterUrl ? { posterUrl } : {}),
})

describe('buildProductGalleryMedia', () => {
  it('returns only images when there are no videos', () => {
    expect(
      buildProductGalleryMedia(
        [
          image('https://cdn.example.com/a.jpg'),
          image('https://cdn.example.com/b.jpg'),
        ],
        [],
      ),
    ).toEqual([
      { type: 'image', url: 'https://cdn.example.com/a.jpg' },
      { type: 'image', url: 'https://cdn.example.com/b.jpg' },
    ])
  })

  it('inserts videos at the second slide when there are enough images', () => {
    expect(
      buildProductGalleryMedia(
        [
          image('https://cdn.example.com/a.jpg'),
          image('https://cdn.example.com/b.jpg'),
          image('https://cdn.example.com/c.jpg'),
        ],
        [
          video(
            'https://cdn.example.com/v1.mp4',
            'https://cdn.example.com/v1.jpg',
          ),
        ],
      ),
    ).toEqual([
      { type: 'image', url: 'https://cdn.example.com/a.jpg' },
      {
        type: 'video',
        url: 'https://cdn.example.com/v1.mp4',
        posterUrl: 'https://cdn.example.com/v1.jpg',
      },
      { type: 'image', url: 'https://cdn.example.com/b.jpg' },
      { type: 'image', url: 'https://cdn.example.com/c.jpg' },
    ])
  })

  it('inserts consecutive videos in Storefront API order', () => {
    const result = buildProductGalleryMedia(
      [
        image('https://cdn.example.com/a.jpg'),
        image('https://cdn.example.com/b.jpg'),
      ],
      [
        video('https://cdn.example.com/v1.mp4'),
        video('https://cdn.example.com/v2.mp4'),
      ],
    )

    expect(result.map((item) => item.url)).toEqual([
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/v1.mp4',
      'https://cdn.example.com/v2.mp4',
      'https://cdn.example.com/b.jpg',
    ])
  })

  it('appends videos when there are fewer images than the insert index', () => {
    expect(
      buildProductGalleryMedia(
        [image('https://cdn.example.com/a.jpg')],
        [video('https://cdn.example.com/v1.mp4')],
      ),
    ).toEqual([
      { type: 'image', url: 'https://cdn.example.com/a.jpg' },
      { type: 'video', url: 'https://cdn.example.com/v1.mp4' },
    ])
  })

  it('returns only videos when the product has no images', () => {
    expect(
      buildProductGalleryMedia([], [video('https://cdn.example.com/v1.mp4')]),
    ).toEqual([{ type: 'video', url: 'https://cdn.example.com/v1.mp4' }])
  })

  it('forwards applyPadding on image items', () => {
    expect(
      buildProductGalleryMedia(
        [image('https://cdn.example.com/a.jpg', true)],
        [],
      ),
    ).toEqual([
      {
        type: 'image',
        url: 'https://cdn.example.com/a.jpg',
        applyPadding: true,
      },
    ])
  })
})

describe('partitionGalleryRows', () => {
  it.each([
    [0, []],
    [1, [1]],
    [2, [2]],
    [3, [1, 2]],
    [4, [2, 2]],
    [5, [2, 3]],
    [6, [2, 2, 2]],
    [7, [2, 2, 3]],
    [8, [2, 3, 3]],
    [9, [2, 2, 2, 3]],
  ])('partitions %i tiles into %j', (count, rows) => {
    expect(partitionGalleryRows(count)).toEqual(rows)
  })

  it.each(Array.from({ length: 20 }, (_, index) => index + 1))(
    'keeps the rules for %i tiles',
    (count) => {
      const rows = partitionGalleryRows(count)
      expect(rows.reduce((sum, size) => sum + size, 0)).toBe(count)
      expect(rows[0]).toBeLessThanOrEqual(2)
      expect(rows.toSorted((a, b) => a - b)).toEqual(rows)
    },
  )
})

describe('buildGalleryTileRowSizes', () => {
  it('expands each row size to one entry per tile', () => {
    expect(buildGalleryTileRowSizes(7)).toEqual([2, 2, 2, 2, 3, 3, 3])
    expect(buildGalleryTileRowSizes(3)).toEqual([1, 2, 2])
  })

  it('returns no sizes for an empty gallery', () => {
    expect(buildGalleryTileRowSizes(0)).toEqual([])
  })
})

describe('buildGalleryTilePresets', () => {
  it('gives every tile the preset for the width of its row', () => {
    // Seven tiles partition into [2, 2, 3].
    expect(buildGalleryTilePresets(7)).toEqual([
      'galleryHalf',
      'galleryHalf',
      'galleryHalf',
      'galleryHalf',
      'galleryThird',
      'galleryThird',
      'galleryThird',
    ])
  })

  it('uses the full-width preset for a lone top tile', () => {
    expect(buildGalleryTilePresets(3)).toEqual([
      'galleryFull',
      'galleryHalf',
      'galleryHalf',
    ])
  })

  it('returns no presets for an empty gallery', () => {
    expect(buildGalleryTilePresets(0)).toEqual([])
  })
})
