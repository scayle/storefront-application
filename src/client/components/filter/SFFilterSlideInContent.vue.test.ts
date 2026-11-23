import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type {
  AppliedFilters,
  AttributeFilter,
  BooleanFilter,
  Filter,
  RangeFilter,
} from '@scayle/storefront/types'
import type { ImageViewOption } from '@shared/types/ImageView'
import SFFilterSlideInContent from './SFFilterSlideInContent.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// A shop edits the color map, so the swatch test resolves against its own.
vi.mock(import('@client/constants'), async (importOriginal) => ({
  ...(await importOriginal()),
  FILTER_COLORS: {
    bordered: { color: '#eeeeee', showBorder: true as const },
    plain: { color: '#222222' },
  },
}))

const stubs = {
  SFMobileSortSelection: true,
  SFMobileImageViewSelection: true,
  SFFilterGroup: {
    name: 'SFFilterGroup',
    props: ['label', 'badge', 'showAction'],
    emits: ['clickReset'],
    template: `<section :data-label="label" :data-badge="badge" :data-show-action="String(showAction)">
      <button data-testid="reset" @click="$emit('clickReset')" /><slot />
    </section>`,
  },
  SFFilterRangeSlider: {
    name: 'SFFilterRangeSlider',
    props: ['modelValue', 'filterSlug', 'min', 'max'],
    emits: ['dragend', 'inputFieldUpdate', 'click'],
    template: '<div data-testid="range" :data-slug="filterSlug" />',
  },
  SFSwitch: {
    name: 'SFSwitch',
    props: ['id', 'modelValue', 'label'],
    emits: ['update:modelValue'],
    template:
      '<input type="checkbox" :data-label="label" @change="$emit(\'update:modelValue\', true)" />',
  },
  SFColorSwatch: {
    name: 'SFColorSwatch',
    props: ['id', 'color', 'contrast', 'label', 'isChecked', 'dataColorId'],
    emits: ['change'],
    template:
      '<i data-testid="swatch" :data-color="color" :data-contrast="contrast" @click="$emit(\'change\')" />',
  },
  SFChipGroup: { template: '<div><slot /></div>' },
  SFChip: {
    name: 'SFChip',
    props: ['item', 'modelValue'],
    emits: ['change'],
    template: '<b data-testid="chip" @click="$emit(\'change\')"><slot /></b>',
  },
  SFCheckbox: {
    name: 'SFCheckbox',
    props: ['id', 'item', 'modelValue', 'label'],
    emits: ['change'],
    template: '<u data-testid="checkbox" @click="$emit(\'change\')" />',
  },
}

const emptyApplied: AppliedFilters = {
  attributes: {},
  booleans: {},
  count: 0,
}

const priceFilter: RangeFilter = {
  type: 'range',
  slug: 'prices',
  name: 'Price',
  min: 1000,
  max: 5000,
  productCount: 10,
}
const reductionFilter: RangeFilter = {
  type: 'range',
  slug: 'max_savings_percentage',
  name: 'Reduction',
  min: 0,
  max: 70,
  productCount: 10,
}
const saleFilter: BooleanFilter = {
  type: 'boolean',
  slug: 'sale',
  name: 'Sale name from API',
  trueCount: 1,
  falseCount: 1,
}
const colorFilter: AttributeFilter = {
  type: 'attributes',
  slug: 'color',
  name: 'Color',
  values: [
    { id: '1', name: 'White', value: 'bordered', productCount: 1 },
    { id: '2', name: 'Black', value: 'plain', productCount: 1 },
    { id: '3', name: 'Mystery', value: 'not_in_map', productCount: 1 },
    { id: '4', name: 'Empty', value: '', productCount: 1 },
  ],
}
const sizeFilter: AttributeFilter = {
  type: 'attributes',
  slug: 'size',
  name: 'Size',
  values: [{ id: '10', name: 'M', value: 'm', productCount: 1 }],
}
const brandFilter: AttributeFilter = {
  type: 'attributes',
  slug: 'brand',
  name: 'Brand',
  values: [{ id: '20', name: 'Acme', value: 'acme', productCount: 1 }],
}

const mountContent = (
  filters: Filter[],
  appliedFilter: AppliedFilters = emptyApplied,
  hideSorting = true,
) =>
  mount(SFFilterSlideInContent, {
    props: { filters, appliedFilter, hideSorting, sortOptions: [] },
    global: { stubs, mocks: { $t: (key: string) => key } },
  })

const groups = (wrapper: ReturnType<typeof mountContent>) =>
  wrapper.findAllComponents({ name: 'SFFilterGroup' })

describe('SFFilterSlideInContent', () => {
  it('renders the image view group only when the shop offers image views', () => {
    const mountWithViews = (imageViewOptions: ImageViewOption[]) =>
      mount(SFFilterSlideInContent, {
        props: {
          filters: [],
          appliedFilter: emptyApplied,
          hideSorting: true,
          sortOptions: [],
          imageViewOptions,
        },
        global: { stubs, mocks: { $t: (key: string) => key } },
      })

    expect(
      groups(mountWithViews([{ value: 'type-a', label: 'Type A' }])).map(
        (group) => group.props('label'),
      ),
    ).toEqual(['image_view_selection.label'])
    expect(groups(mountWithViews([]))).toHaveLength(0)
  })

  it('renders the sorting group only when sorting is not hidden', () => {
    expect(groups(mountContent([], emptyApplied, false))).toHaveLength(1)
    expect(groups(mountContent([], emptyApplied, true))).toHaveLength(0)
  })

  describe('range filters', () => {
    it('skips a range filter whose min equals max', () => {
      const wrapper = mountContent([{ ...priceFilter, min: 5, max: 5 }])
      expect(groups(wrapper)).toHaveLength(0)
    })

    it('renders the price sub-branch and emits the price events', async () => {
      const applied = { ...emptyApplied, price: { min: 2000, max: 5000 } }
      const wrapper = mountContent([priceFilter], applied)
      const group = groups(wrapper)[0]!
      const slider = wrapper.findComponent({ name: 'SFFilterRangeSlider' })

      expect(group.props('label')).toBe('Price')
      // Applied range differs from the filter boundaries, so reset is shown.
      expect(group.props('showAction')).toBe(true)
      expect(slider.props('modelValue')).toEqual([2000, 5000])

      slider.vm.$emit('dragend', [2500, 4000])
      expect(wrapper.emitted('handleApplyOrResetPriceFilterEmit')).toEqual([
        [[2500, 4000], 1000, 5000],
      ])
      expect(
        wrapper.emitted('handleApplyOrResetReductionFilterEmit'),
      ).toBeUndefined()

      await group.get('[data-testid="reset"]').trigger('click')
      expect(wrapper.emitted('resetPriceFilter')).toHaveLength(1)
    })

    it.for([
      { when: 'no price is applied', applied: emptyApplied },
      {
        when: 'the applied range matches the boundaries',
        applied: { ...emptyApplied, price: { min: 1000, max: 5000 } },
      },
    ])('hides the price reset when $when', ({ applied }) => {
      const wrapper = mountContent([priceFilter], applied)
      expect(groups(wrapper)[0]!.props('showAction')).toBe(false)
    })

    it('renders the max_savings_percentage sub-branch and emits the reduction events', async () => {
      const applied = { ...emptyApplied, reduction: { min: 10, max: 70 } }
      const wrapper = mountContent([reductionFilter], applied)
      const group = groups(wrapper)[0]!
      const slider = wrapper.findComponent({ name: 'SFFilterRangeSlider' })

      expect(group.props('label')).toBe('Reduction')
      expect(group.props('showAction')).toBe(true)
      expect(slider.props('modelValue')).toEqual([10, 70])

      slider.vm.$emit('inputFieldUpdate', [20, 60])
      expect(wrapper.emitted('handleApplyOrResetReductionFilterEmit')).toEqual([
        [[20, 60], 0, 70],
      ])
      expect(
        wrapper.emitted('handleApplyOrResetPriceFilterEmit'),
      ).toBeUndefined()

      await group.get('[data-testid="reset"]').trigger('click')
      expect(wrapper.emitted('resetReductionFilter')).toHaveLength(1)
    })

    it('renders no group for a range filter with an unknown slug', () => {
      const wrapper = mountContent([{ ...priceFilter, slug: 'weight' }])
      expect(groups(wrapper)).toHaveLength(0)
    })
  })

  describe('boolean filters', () => {
    it('uses the translated label for the sale filter', () => {
      const wrapper = mountContent([saleFilter])
      expect(wrapper.findComponent({ name: 'SFSwitch' }).props('label')).toBe(
        'filter_slide_in_content.only_sale_option',
      )
    })

    it('uses the API name for any other boolean filter', () => {
      const wrapper = mountContent([
        { ...saleFilter, slug: 'in_stock', name: 'In stock' },
      ])
      expect(wrapper.findComponent({ name: 'SFSwitch' }).props('label')).toBe(
        'In stock',
      )
    })

    it('emits applyBooleanFilter with the slug when toggled', async () => {
      const wrapper = mountContent([saleFilter], {
        ...emptyApplied,
        booleans: { sale: true },
      })
      const toggle = wrapper.findComponent({ name: 'SFSwitch' })
      expect(toggle.props('modelValue')).toBe(true)

      await toggle.trigger('change')
      expect(wrapper.emitted('applyBooleanFilter')).toEqual([['sale']])
    })
  })

  describe('attribute filters', () => {
    it('resolves swatch color and contrast from FILTER_COLORS', async () => {
      const wrapper = mountContent([colorFilter], {
        ...emptyApplied,
        attributes: { color: ['2'] },
      })
      const swatches = wrapper.findAllComponents({ name: 'SFColorSwatch' })

      // The value-less entry is skipped.
      expect(swatches).toHaveLength(3)
      expect(swatches[0]!.props()).toMatchObject({
        color: '#eeeeee',
        contrast: 'low',
        isChecked: false,
      })
      expect(swatches[1]!.props()).toMatchObject({
        color: '#222222',
        contrast: 'high',
        isChecked: true,
      })
      // Unmapped color falls back to a neutral gray with high contrast.
      expect(swatches[2]!.props()).toMatchObject({
        color: '#cccccc',
        contrast: 'high',
      })
      expect(groups(wrapper)[0]!.props('badge')).toBe(1)

      swatches[2]!.vm.$emit('change')
      expect(wrapper.emitted('applyAttributeFilter')).toEqual([['color', '3']])
    })

    it('renders size chips', () => {
      const wrapper = mountContent([sizeFilter])
      const chips = wrapper.findAllComponents({ name: 'SFChip' })

      expect(chips).toHaveLength(1)
      expect(chips[0]!.text()).toBe('M')
      chips[0]!.vm.$emit('change')
      expect(wrapper.emitted('applyAttributeFilter')).toEqual([['size', '10']])
    })

    it('renders checkboxes for any other attribute and emits reset with the slug', async () => {
      const wrapper = mountContent([brandFilter])
      const boxes = wrapper.findAllComponents({ name: 'SFCheckbox' })

      expect(boxes).toHaveLength(1)
      expect(boxes[0]!.props('label')).toBe('Acme')
      boxes[0]!.vm.$emit('change')
      expect(wrapper.emitted('applyAttributeFilter')).toEqual([['brand', '20']])

      await groups(wrapper)[0]!.get('[data-testid="reset"]').trigger('click')
      expect(wrapper.emitted('resetAttributeFilter')).toEqual([['brand']])
    })
  })
})
