import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImageViewItem } from '@client/composables/useImageView'
import SFImageViewSelection from './SFImageViewSelection.vue'

// Item order, the selection and the URL update are `useImageView`'s and are
// tested there. This file covers what the dropdown renders from them.
const mocks = vi.hoisted(() => ({
  selectImageType: vi.fn(),
  selectedImageType: undefined as string | undefined,
  items: [
    { value: undefined, label: 'Default' },
    { value: 'type-a', label: 'Type A' },
    { value: 'type-b', label: 'Type B' },
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

vi.mock('@client/directives/popover', () => ({
  vPopover: {
    mounted() {},
    getSSRProps() {
      return {}
    },
  },
}))

vi.mock('@client/composables/useDefaultBreakpoints', () => ({
  useDefaultBreakpoints: () => ({
    smaller: () => ({ value: false }),
  }),
}))

vi.mock('@assets/icons/navigation/down.svg', () => ({
  default: { name: 'IconChevronDown', template: '<svg />' },
}))

vi.mock('@assets/icons/notify/alert.svg', () => ({
  default: { name: 'IconAlert', template: '<svg />' },
}))

vi.mock('@assets/icons/checkmark/default.svg', () => ({
  default: { name: 'IconCheckmarkDefault', template: '<svg />' },
}))

const mountSelection = () =>
  mount(SFImageViewSelection, {
    props: { options: [] },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { Transition: { template: '<div><slot /></div>' } },
    },
  })

describe('SFImageViewSelection', () => {
  beforeEach(() => {
    mocks.selectedImageType = undefined
  })

  it('renders one option per item, in item order', () => {
    const options = mountSelection().findAll('[role="option"]')

    expect(options.map((option) => option.text())).toEqual([
      'Default',
      'Type A',
      'Type B',
    ])
  })

  it('exposes the selected item as the selected option', () => {
    mocks.selectedImageType = 'type-b'
    const wrapper = mountSelection()

    expect(
      wrapper
        .get('[data-testid="image-view-item-type-b"]')
        .attributes('aria-selected'),
    ).toBe('true')
    expect(
      wrapper
        .get('[data-testid="image-view-item-default"]')
        .attributes('aria-selected'),
    ).toBe('false')
  })

  it('selects the view of the chosen option', async () => {
    const wrapper = mountSelection()

    await wrapper.get('[data-testid="image-view-item-type-a"]').trigger('click')

    expect(mocks.selectImageType).toHaveBeenCalledWith('type-a')
  })
})
