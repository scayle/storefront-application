import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { ChipSubType, ChipVariant } from '@client/utils/constants'
import SFChip from './SFChip.vue'
import SFChipGroup from './SFChipGroup.vue'

/**
 * SFChipGroup is the layout wrapper for a row / wrap of SFChips.
 * It applies `gap-2` (the design-system spacing-2 token) and
 * encodes selection semantics via the `selection-mode` prop:
 *
 * - `single` → `<fieldset role="radiogroup">` for keyboard
 *   navigation across radio chips.
 * - `multi`  → `<div>`, a `group` when `aria-label` names it; native
 *   checkbox chips announce themselves individually.
 * - `none`   → `<div>` like `multi`, for non-selectable rows
 *   (e.g. lists of dismissable filter chips).
 *
 * Stories mirror the "group" documentation page in Figma,
 * including filter-chip, voucher-row, and promotion-row use cases.
 */
export default {
  title: 'UI/Core/SFChipGroup',
  component: SFChipGroup,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFChipGroup>

type Story = StoryObj<typeof SFChipGroup>

export const Default: Story = {
  render: () => ({
    components: { SFChip, SFChipGroup },
    setup() {
      const selected = ref<string[]>([])
      const sizes = ['XS', 'S', 'M', 'L', 'XL']
      return { selected, sizes }
    },
    template: `
      <SFChipGroup selection-mode="multi" aria-label="Pick sizes">
        <SFChip
          v-for="size in sizes"
          :key="size"
          v-model="selected"
          :variant="'multi-select'"
          :item="size"
          :input-aria-label="'Toggle size ' + size"
        >{{ size }}</SFChip>
      </SFChipGroup>`,
  }),
}

export const SingleSelectGroup: Story = {
  render: () => ({
    components: { SFChip, SFChipGroup },
    setup() {
      const selected = ref<string | undefined>(undefined)
      const sizes = ['XS', 'S', 'M', 'L', 'XL']
      return { selected, sizes }
    },
    template: `
      <SFChipGroup selection-mode="single" aria-label="Pick a size" legend="Size">
        <SFChip
          v-for="size in sizes"
          :key="size"
          v-model="selected"
          :variant="'single-select'"
          :item="size"
          :input-aria-label="'Pick size ' + size"
        >{{ size }}</SFChip>
      </SFChipGroup>`,
  }),
}

export const DismissableRow: Story = {
  render: () => ({
    components: { SFChip, SFChipGroup },
    setup() {
      const dismissed = ref<Set<string>>(new Set())
      const items = [
        { id: 'sale', label: 'Sale', subType: ChipSubType.PROMOTION },
        {
          id: 'voucher-summer',
          label: 'Summer Deal | 20% OFF',
          subType: ChipSubType.VOUCHER,
        },
        {
          id: 'voucher-newsletter',
          label: 'Newsletter -10%',
          subType: ChipSubType.VOUCHER,
        },
        {
          id: 'celebrate',
          label: 'Celebrate 40y',
          subType: ChipSubType.PROMOTION,
        },
      ]
      const onDismiss = (id: string) => dismissed.value.add(id)
      return { items, dismissed, onDismiss }
    },
    template: `
      <SFChipGroup selection-mode="none" aria-label="Active filters">
        <template v-for="item in items" :key="item.id">
          <SFChip
            v-if="!dismissed.has(item.id)"
            :variant="'dismissable'"
            :sub-type="item.subType"
            :item="item.id"
            @dismiss="onDismiss(item.id)"
          >{{ item.label }}</SFChip>
        </template>
      </SFChipGroup>`,
  }),
}

export const AllVariantsShowcase: Story = {
  render: () => ({
    components: { SFChip, SFChipGroup },
    setup() {
      const sizesMulti = ref<string[]>(['S'])
      const sizeSingle = ref<string | undefined>('M')
      const choice = ref<string>('a')
      const dismissed = ref<Set<string>>(new Set())
      const onDismiss = (id: string) => dismissed.value.add(id)
      return {
        sizesMulti,
        sizeSingle,
        choice,
        dismissed,
        onDismiss,
        ChipVariant,
        ChipSubType,
      }
    },
    template: `
      <div class="flex flex-col gap-8">
        <section>
          <h3 class="mb-2 text-sm font-semibold text-primary">Filter chips (multi-select)</h3>
          <SFChipGroup selection-mode="multi" aria-label="Sizes">
            <SFChip v-for="size in ['XS','S','M','L','XL']" :key="size"
              v-model="sizesMulti" variant="multi-select" :item="size"
              :input-aria-label="'Toggle size ' + size">{{ size }}</SFChip>
          </SFChipGroup>
        </section>

        <section>
          <h3 class="mb-2 text-sm font-semibold text-primary">Category slider (single-select)</h3>
          <SFChipGroup selection-mode="single" aria-label="Category" legend="Category">
            <SFChip v-for="c in ['New','Women','Men','Kids','Sale']" :key="c"
              v-model="sizeSingle" variant="single-select" :item="c"
              :input-aria-label="'Pick ' + c">{{ c }}</SFChip>
          </SFChipGroup>
        </section>

        <section>
          <h3 class="mb-2 text-sm font-semibold text-primary">Voucher row</h3>
          <SFChipGroup selection-mode="none" aria-label="Active vouchers">
            <SFChip v-if="!dismissed.has('v1')" variant="dismissable" sub-type="voucher" item="v1" @dismiss="onDismiss('v1')">Summer Deal | 20% OFF</SFChip>
            <SFChip v-if="!dismissed.has('v2')" variant="dismissable" sub-type="voucher" item="v2" @dismiss="onDismiss('v2')">Newsletter -10%</SFChip>
            <SFChip v-if="!dismissed.has('v3')" variant="dismissable" sub-type="voucher" item="v3" @dismiss="onDismiss('v3')">FREESHIP</SFChip>
          </SFChipGroup>
        </section>

        <section>
          <h3 class="mb-2 text-sm font-semibold text-primary">Promotion row</h3>
          <SFChipGroup selection-mode="none" aria-label="Active promotions">
            <SFChip v-if="!dismissed.has('p1')" variant="dismissable" sub-type="promotion" item="p1" @dismiss="onDismiss('p1')">Celebrate 40y</SFChip>
            <SFChip v-if="!dismissed.has('p2')" variant="dismissable" sub-type="promotion" item="p2" @dismiss="onDismiss('p2')">Black Friday</SFChip>
            <SFChip v-if="!dismissed.has('p3')" variant="dismissable" sub-type="promotion" item="p3" @dismiss="onDismiss('p3')">ABOUT YOU Limited</SFChip>
          </SFChipGroup>
        </section>
      </div>`,
  }),
}
