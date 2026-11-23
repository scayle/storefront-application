import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { ImageViewOption } from '@shared/types/ImageView'
import { useImageView } from './useImageView'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))

const currentUrl = ref(new URL('https://example.com/c/women-1'))

vi.mock('@inertiajs/vue3', () => ({ router: { replace } }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('./useRoute', () => ({
  useRoute: () => ({
    path: computed(() => currentUrl.value.pathname),
    query: computed(() => new URLSearchParams(currentUrl.value.search)),
  }),
}))

const options: ImageViewOption[] = [
  { value: 'type-a', label: 'Type A' },
  { value: 'type-b', label: 'Type B' },
]

const visit = (path: string) => {
  currentUrl.value = new URL(path, 'https://example.com')
}

describe('useImageView', () => {
  beforeEach(() => {
    visit('/c/women-1')
  })

  it('lists the default view first, then the options in delivered order', () => {
    expect(useImageView(options).items.value).toEqual([
      { value: undefined, label: 'image_view_selection.default' },
      ...options,
    ])
  })

  it('selects the default view when the URL names no view', () => {
    const { selectedImageType, selectedItem } = useImageView(options)

    expect(selectedImageType.value).toBeUndefined()
    expect(selectedItem.value).toEqual({
      value: undefined,
      label: 'image_view_selection.default',
    })
  })

  it('selects the view the URL names', () => {
    visit('/c/women-1?imageView=type-b')
    const { selectedImageType, selectedItem } = useImageView(options)

    expect(selectedImageType.value).toBe('type-b')
    expect(selectedItem.value).toEqual(options[1])
  })

  it('falls back to the default view when the URL names a view the shop does not offer', () => {
    visit('/c/women-1?imageView=retired')
    const { selectedImageType, selectedItem } = useImageView(options)

    expect(selectedImageType.value).toBeUndefined()
    expect(selectedItem.value.value).toBeUndefined()
  })

  it('replaces the URL with the selected view and keeps the other parameters', () => {
    visit('/c/women-1?sort=price_asc&page=2')

    useImageView(options).selectImageType('type-a')

    expect(replace).toHaveBeenCalledWith({
      url: '/c/women-1?sort=price_asc&page=2&imageView=type-a',
      preserveScroll: true,
      preserveState: true,
    })
  })

  it.for([
    {
      when: 'a view is selected next to other parameters',
      from: '/c/women-1?imageView=type-a&sort=price_asc',
      to: '/c/women-1?sort=price_asc',
    },
    {
      when: 'the view is the only parameter',
      from: '/c/women-1?imageView=type-a',
      to: '/c/women-1',
    },
    {
      when: 'the URL names a view the shop does not offer',
      from: '/c/women-1?imageView=retired&sort=price_asc',
      to: '/c/women-1?sort=price_asc',
    },
  ])(
    'removes the parameter when the default view is chosen and $when',
    ({ from, to }) => {
      visit(from)

      useImageView(options).selectImageType(undefined)

      expect(replace).toHaveBeenCalledWith(expect.objectContaining({ url: to }))
    },
  )

  it('leaves the URL alone when the selected view is chosen again', () => {
    visit('/c/women-1?imageView=type-a')

    useImageView(options).selectImageType('type-a')

    expect(replace).not.toHaveBeenCalled()
  })
})
