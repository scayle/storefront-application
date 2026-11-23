import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ProductGalleryItem } from '@shared/utils/productGalleryMedia'
import SFProductImageGrid from './SFProductImageGrid.vue'

const buildImages = (count: number): ProductGalleryItem[] =>
  Array.from({ length: count }, (_, index) => ({
    type: 'image' as const,
    url: `https://cdn.example/img-${index}.jpg`,
  }))

const stubs = {
  SFProductImage: {
    props: [
      'url',
      'preset',
      'alt',
      'applyPadding',
      'imageLoading',
      'fetchPriority',
    ],
    template:
      '<img data-testid="grid-image" :data-url="url" :data-preset="preset" :data-loading="imageLoading" :data-priority="fetchPriority" :alt="alt">',
  },
  SFProductVideoSlide: defineComponent({
    name: 'SFProductVideoSlide',
    props: ['url', 'posterUrl', 'alt', 'isPlaying'],
    emits: ['play'],
    template:
      '<div data-testid="grid-video" :data-url="url" :data-poster="posterUrl" :data-playing="String(isPlaying)" @click="$emit(\'play\')"></div>',
  }),
}

// Serializing `$t` mock (as in SFProductSlider.vue.test.ts) so the container
// and per-tile labels keep their key and params and stay distinct/assertable.
const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}(${JSON.stringify(params)})` : key

const mountGrid = (
  items: ProductGalleryItem[] | number,
  playingVideoIndex?: number,
) =>
  mount(SFProductImageGrid, {
    props: {
      items: typeof items === 'number' ? buildImages(items) : items,
      productName: 'Test Shirt',
      playingVideoIndex,
    },
    global: { stubs, mocks: { $t: t } },
  })

const WHITESPACE = /\s+/

const spans = (items: ProductGalleryItem[] | number) =>
  mountGrid(items)
    .findAll('li')
    .map((li) =>
      (li.attributes('class') ?? '')
        .split(WHITESPACE)
        .find((c) => c.startsWith('col-span-')),
    )

const buildMedia = (
  imageCount: number,
  videoCount: number,
): ProductGalleryItem[] => [
  ...buildImages(1),
  ...Array.from({ length: videoCount }, (_, index) => ({
    type: 'video' as const,
    url: `https://cdn.example/video-${index}.mp4`,
  })),
  ...buildImages(imageCount).slice(1),
]

describe('SFProductImageGrid', () => {
  it('gives each tile the preset for the width of its grid row', () => {
    const tiles = mountGrid(3).findAll('[data-testid="grid-image"]')
    expect(tiles.map((tile) => tile.attributes('data-preset'))).toEqual([
      'galleryFull',
      'galleryHalf',
      'galleryHalf',
    ])
  })

  it('eager-loads the first tile at high priority and lazy-loads the rest', () => {
    const tiles = mountGrid(3).findAll('[data-testid="grid-image"]')
    expect(tiles[0]!.attributes('data-loading')).toBe('eager')
    expect(tiles[0]!.attributes('data-priority')).toBe('high')
    for (const tile of tiles.slice(1)) {
      expect(tile.attributes('data-loading')).toBe('lazy')
      expect(tile.attributes('data-priority')).toBe('auto')
    }
  })

  it('emits enlarge with the tile index on click', async () => {
    const wrapper = mountGrid(3)
    await wrapper.findAll('button')[2]!.trigger('click')
    expect(wrapper.emitted('enlarge')).toEqual([[2]])
  })

  // Guards the a11y attributes that read as "redundant" and would otherwise
  // vanish silently: the explicit list role (Tailwind's `list-style: none`
  // drops it in Safari otherwise) and the named container label.
  it('exposes the grid as a labelled list', () => {
    const grid = mountGrid(3).get('[data-testid="product-image-grid"]')
    expect(grid.attributes('role')).toBe('list')
    expect(grid.attributes('aria-label')).toBe(
      'product_image.a11y.grid_label({"name":"Test Shirt"})',
    )
  })

  it('gives each tile a distinct enlarge label with its position', () => {
    const labels = mountGrid(3)
      .findAll('[data-testid^="product-grid-tile-"]')
      .map((tile) => tile.attributes('aria-label'))
    expect(labels).toEqual([
      'product_image.a11y.enlarge_image({"index":1,"total":3})',
      'product_image.a11y.enlarge_image({"index":2,"total":3})',
      'product_image.a11y.enlarge_image({"index":3,"total":3})',
    ])
  })

  // Every legal row sums to 6 (spans 6/3/2 for rows of 1/2/3), so the grid wraps
  // without gaps. The row partition itself is tested in productGalleryMedia.test.ts;
  // these counts cover each row size once.
  it.for([
    { count: 1, expected: ['col-span-6'] },
    { count: 2, expected: ['col-span-3', 'col-span-3'] },
    {
      count: 5,
      expected: [
        'col-span-3',
        'col-span-3',
        'col-span-2',
        'col-span-2',
        'col-span-2',
      ],
    },
  ])(
    'lays out $count images with the expected column spans',
    ({ count, expected }) => {
      expect(spans(count)).toEqual(expected)
    },
  )

  it('counts video tiles like image tiles in the layout', () => {
    expect(spans(buildMedia(3, 2))).toEqual(spans(5))
  })

  it('marks the matching video tile as playing', () => {
    const items = buildMedia(3, 1)
    const wrapper = mountGrid(items, 1)
    const video = wrapper.find('[data-testid="product-grid-tile-1"]')
    expect(video.attributes('data-playing')).toBe('true')
    expect(video.attributes('data-url')).toBe('https://cdn.example/video-0.mp4')
  })

  it('forwards play from a video tile as playVideo with the tile index', async () => {
    const items = buildMedia(3, 1)
    const wrapper = mountGrid(items)
    await wrapper.find('[data-testid="product-grid-tile-1"]').trigger('click')
    expect(wrapper.emitted('playVideo')).toEqual([[1]])
  })
})
