import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImageViewItem } from '@client/composables/useImageView'
import SFMobileImageViewSelection from './SFMobileImageViewSelection.vue'

// Item order, the selection and the URL update are `useImageView`'s and are
// tested there. This file covers what the buttons render from them.
const mocks = vi.hoisted(() => ({
  selectImageType: vi.fn(),
  selectedImageType: undefined as string | undefined,
  items: [
    { value: undefined, label: 'Default' },
    { value: 'type-a', label: 'Type A' },
  ] as ImageViewItem[],
}))

vi.mock('@client/composables/useImageView', async () => {
  const { computed } = await import('vue')
  return {
    useImageView: () => ({
      items: computed(() => mocks.items),
      selectedItem: computed(() =>
        mocks.items.find((item) => item.value === mocks.selectedImageType)!,
      ),
      selectedImageType: computed(() => mocks.selectedImageType),
      selectImageType: mocks.selectImageType,
    }),
  }
})

const mountSelection = () =>
  mount(SFMobileImageViewSelection, {
    props: { options: [] },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        SFButton: { template: '<button v-bind="$attrs"><slot /></button>' },
      },
    },
  })

describe('SFMobileImageViewSelection', () => {
  beforeEach(() => {
    mocks.selectedImageType = undefined
  })

  it('exposes the selected view as the pressed button', () => {
    mocks.selectedImageType = 'type-a'
    const wrapper = mountSelection()

    expect(
      wrapper
        .get('[data-testid="mobile-image-view-item-type-a"]')
        .attributes('aria-pressed'),
    ).toBe('true')
    expect(
      wrapper
        .get('[data-testid="mobile-image-view-item-default"]')
        .attributes('aria-pressed'),
    ).toBe('false')
  })

  it('selects the default view when its button is chosen', async () => {
    mocks.selectedImageType = 'type-a'
    const wrapper = mountSelection()

    await wrapper
      .get('[data-testid="mobile-image-view-item-default"]')
      .trigger('click')

    expect(mocks.selectImageType).toHaveBeenCalledWith(undefined)
  })
})
