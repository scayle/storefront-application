import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import { ChipSubType, ChipVariant } from '@client/utils/constants'
import SFChip from './SFChip.vue'
import SFChipGroup from './SFChipGroup.vue'

// Storybook's `Meta` rejects a generic component as `component`
// (https://github.com/storybookjs/storybook/issues/24238), so that field is typed separately.
// Arg value types are still checked, but an unknown arg name is not.
type SFChipMeta = Omit<Meta<typeof SFChip>, 'component'> & {
  component: typeof SFChip
}

/**
 * SFChip implements the four design-system chip variants:
 * Single-select, Multi-select, Dismissable (Voucher / Promotion),
 * and Choice. Each variant maps to a unique set of design tokens
 * (radius, height, padding, colors) per Figma.
 *
 * Stories mirror the Figma documentation pages: each variant has
 * dedicated Enabled / Selected / Disabled stories plus a State
 * Matrix table that lists the exact tokens and values used in
 * every state. Hover state is discoverable by hovering a preview
 * chip inside the matrix.
 */
export default {
  title: 'UI/Core/SFChip',
  component: SFChip,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: Object.values(ChipVariant),
    },
    subType: {
      control: { type: 'select' },
      options: Object.values(ChipSubType),
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFChip>) => ({
    components: { SFChip },
    setup() {
      const selected = ref<unknown>(undefined)
      return { args, selected }
    },
    template: `<SFChip v-model="selected" v-bind="args">{{ args.default ?? 'Label' }}</SFChip>`,
  }),
} satisfies SFChipMeta

type Story = StoryObj<typeof SFChip>

/* ============================================================
   Single-select
   ============================================================ */

export const SingleSelectEnabled: Story = {
  args: {
    variant: ChipVariant.SINGLE_SELECT,
    item: 'sm',
    default: 'Label',
    inputAriaLabel: 'Select size SM',
  },
}

export const SingleSelectSelected: Story = {
  args: {
    variant: ChipVariant.SINGLE_SELECT,
    item: 'sm',
    default: 'Label',
    inputAriaLabel: 'Select size SM',
  },
  render: (args: ComponentPropsAndSlots<typeof SFChip>) => ({
    components: { SFChip },
    setup() {
      const selected = ref<string>('sm')
      return { args, selected }
    },
    template: `<SFChip v-model="selected" v-bind="args">{{ args.default }}</SFChip>`,
  }),
}

export const SingleSelectDisabled: Story = {
  args: {
    variant: ChipVariant.SINGLE_SELECT,
    item: 'sm',
    disabled: true,
    default: 'Label',
    inputAriaLabel: 'Select size SM',
  },
}

/* ============================================================
   Multi-select
   ============================================================ */

export const MultiSelectEnabled: Story = {
  args: {
    variant: ChipVariant.MULTI_SELECT,
    item: 'sm',
    default: 'Label',
    inputAriaLabel: 'Toggle size SM',
  },
  render: (args: ComponentPropsAndSlots<typeof SFChip>) => ({
    components: { SFChip },
    setup() {
      const selected = ref<string[]>([])
      return { args, selected }
    },
    template: `<SFChip v-model="selected" v-bind="args">{{ args.default }}</SFChip>`,
  }),
}

export const MultiSelectSelected: Story = {
  args: {
    variant: ChipVariant.MULTI_SELECT,
    item: 'sm',
    default: 'Label',
    inputAriaLabel: 'Toggle size SM',
  },
  render: (args: ComponentPropsAndSlots<typeof SFChip>) => ({
    components: { SFChip },
    setup() {
      const selected = ref<string[]>(['sm'])
      return { args, selected }
    },
    template: `<SFChip v-model="selected" v-bind="args">{{ args.default }}</SFChip>`,
  }),
}

export const MultiSelectDisabled: Story = {
  args: {
    variant: ChipVariant.MULTI_SELECT,
    item: 'sm',
    disabled: true,
    default: 'Label',
    inputAriaLabel: 'Toggle size SM',
  },
  render: (args: ComponentPropsAndSlots<typeof SFChip>) => ({
    components: { SFChip },
    setup() {
      const selected = ref<string[]>([])
      return { args, selected }
    },
    template: `<SFChip v-model="selected" v-bind="args">{{ args.default }}</SFChip>`,
  }),
}

/* ============================================================
   Choice
   ============================================================ */

export const ChoiceEnabled: Story = {
  args: {
    variant: ChipVariant.CHOICE,
    item: 'a',
    default: 'Label',
    inputAriaLabel: 'Pick option A',
  },
}

export const ChoiceSelected: Story = {
  args: {
    variant: ChipVariant.CHOICE,
    item: 'a',
    default: 'Label',
    inputAriaLabel: 'Pick option A',
  },
  render: (args: ComponentPropsAndSlots<typeof SFChip>) => ({
    components: { SFChip },
    setup() {
      const selected = ref<string>('a')
      return { args, selected }
    },
    template: `<SFChip v-model="selected" v-bind="args">{{ args.default }}</SFChip>`,
  }),
}

export const ChoiceDisabled: Story = {
  args: {
    variant: ChipVariant.CHOICE,
    item: 'a',
    disabled: true,
    default: 'Label',
    inputAriaLabel: 'Pick option A',
  },
}

/* ============================================================
   Choice Example (composition)
   ============================================================ */

export const ChoiceExampleActive1: Story = {
  render: () => ({
    components: { SFChip, SFChipGroup },
    setup() {
      const selected = ref<string>('a')
      return { selected }
    },
    template: `
      <SFChipGroup selection-mode="single" aria-label="Choice example" class="w-[390px]">
        <SFChip v-model="selected" :variant="'choice'" item="a" input-aria-label="Option A" class="flex-1">Option A</SFChip>
        <SFChip v-model="selected" :variant="'choice'" item="b" input-aria-label="Option B" class="flex-1">Option B</SFChip>
      </SFChipGroup>`,
  }),
}

export const ChoiceExampleActive2: Story = {
  render: () => ({
    components: { SFChip, SFChipGroup },
    setup() {
      const selected = ref<string>('b')
      return { selected }
    },
    template: `
      <SFChipGroup selection-mode="single" aria-label="Choice example" class="w-[390px]">
        <SFChip v-model="selected" :variant="'choice'" item="a" input-aria-label="Option A" class="flex-1">Option A</SFChip>
        <SFChip v-model="selected" :variant="'choice'" item="b" input-aria-label="Option B" class="flex-1">Option B</SFChip>
      </SFChipGroup>`,
  }),
}

/* ============================================================
   Dismissable — Voucher
   ============================================================ */

export const DismissableVoucherEnabled: Story = {
  args: {
    variant: ChipVariant.DISMISSABLE,
    subType: ChipSubType.VOUCHER,
    item: 'SUMMER20',
    default: 'Summer Deal | 20% OFF',
  },
}

export const DismissableVoucherDisabled: Story = {
  args: {
    variant: ChipVariant.DISMISSABLE,
    subType: ChipSubType.VOUCHER,
    item: 'SUMMER20',
    disabled: true,
    default: 'Summer Deal | 20% OFF',
  },
}

/* ============================================================
   Dismissable — Promotion
   ============================================================ */

export const DismissablePromotionEnabled: Story = {
  args: {
    variant: ChipVariant.DISMISSABLE,
    subType: ChipSubType.PROMOTION,
    item: 'celebrate-40y',
    default: 'Celebrate 40y',
  },
}

export const DismissablePromotionDisabled: Story = {
  args: {
    variant: ChipVariant.DISMISSABLE,
    subType: ChipSubType.PROMOTION,
    item: 'celebrate-40y',
    disabled: true,
    default: 'Celebrate 40y',
  },
}

/* ============================================================
   State Matrix — mirrors the Figma documentation tables.
   Rows = states; columns = State / Token(s) / Value(s) / Preview / Usage.
   ============================================================ */

const matrixTableCls =
  'border-collapse text-sm text-left [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:border-b [&_th]:border-gray-300 [&_td]:px-3 [&_td]:py-3 [&_td]:border-b [&_td]:border-gray-200 [&_td]:align-top [&_code]:block [&_code]:font-mono [&_code]:text-[11px]'

export const SingleSelectStateMatrix: Story = {
  render: () => ({
    components: { SFChip },
    setup() {
      const selected = ref<string>('selected-row')
      const rows = [
        {
          state: 'Enabled',
          tokens: [
            'bg-gray-200',
            'rounded-full',
            'h-10',
            'px-4',
            'text-secondary',
            'text-md',
            'font-semibold',
          ],
          values: ['#F2F2F2', '9999px', '40px', '16px', '#666666', '14px'],
          usage: 'Category slider',
          item: 'enabled-row',
        },
        {
          state: 'Hover',
          tokens: [
            'bg-white',
            'border-gray-400',
            'border-1',
            'shadow-input',
            'text-primary',
          ],
          values: ['#FFFFFF', '#D9D9D9', '1px', 'shadow-input', '#171717'],
          usage: 'Hover this preview cell to see the state',
          item: 'hover-row',
        },
        {
          state: 'Selected',
          tokens: ['bg-white', 'border-primary', 'border-2', 'text-primary'],
          values: ['#FFFFFF', '#171717', '2px', '#171717'],
          usage: 'Category slider',
          item: 'selected-row',
        },
        {
          state: 'Disabled',
          tokens: [
            'bg-gray-100',
            'border-gray-300',
            'border-1',
            'text-gray-500',
            'font-normal',
          ],
          values: ['#FAFAFA', '#EBEBEB', '1px', '#A8A8A8'],
          usage: 'Category slider',
          item: 'disabled-row',
        },
      ]
      return { selected, rows }
    },
    template: `
      <table :class="'${matrixTableCls}'">
        <thead><tr><th>State</th><th>Token(s)</th><th>Value(s)</th><th>Preview</th><th>Usage</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.state">
            <td class="font-semibold">{{ row.state }}</td>
            <td><code v-for="t in row.tokens" :key="t">{{ t }}</code></td>
            <td><code v-for="v in row.values" :key="v">{{ v }}</code></td>
            <td>
              <SFChip
                v-model="selected"
                :variant="'single-select'"
                :item="row.item"
                :disabled="row.state === 'Disabled'"
                :input-aria-label="row.state"
              >Label</SFChip>
            </td>
            <td>{{ row.usage }}</td>
          </tr>
        </tbody>
      </table>`,
  }),
}

export const MultiSelectStateMatrix: Story = {
  render: () => ({
    components: { SFChip },
    setup() {
      const selected = ref<string[]>(['selected-row'])
      const rows = [
        {
          state: 'Enabled',
          tokens: [
            'bg-white',
            'border-gray-400',
            'border-1',
            'rounded-lg',
            'h-10',
            'px-4',
            'text-primary',
            'text-sm',
            'font-semibold',
          ],
          values: [
            '#FFFFFF',
            '#D9D9D9',
            '1px',
            '8px',
            '40px',
            '16px',
            '#171717',
            '12px',
          ],
          usage: 'Filter chip group',
          item: 'enabled-row',
        },
        {
          state: 'Hover',
          tokens: [
            'bg-white',
            'border-accent',
            'border-2',
            'shadow-input',
            'text-primary',
          ],
          values: ['#FFFFFF', '#5328E1', '2px', 'shadow-input', '#171717'],
          usage: 'Hover this preview cell to see the state',
          item: 'hover-row',
        },
        {
          state: 'Selected',
          tokens: [
            'bg-accent',
            'text-white',
            'border-transparent',
            'rounded-lg',
            'text-sm',
            'font-semibold',
          ],
          values: ['#5328E1', '#FFFFFF', 'transparent', '8px', '12px'],
          usage: 'Filter chip group',
          item: 'selected-row',
        },
        {
          state: 'Disabled',
          tokens: [
            'bg-gray-100',
            'border-gray-300',
            'border-1',
            'text-gray-500',
            'font-normal',
          ],
          values: ['#FAFAFA', '#EBEBEB', '1px', '#A8A8A8'],
          usage: 'Filter chip group',
          item: 'disabled-row',
        },
      ]
      return { selected, rows }
    },
    template: `
      <table :class="'${matrixTableCls}'">
        <thead><tr><th>State</th><th>Token(s)</th><th>Value(s)</th><th>Preview</th><th>Usage</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.state">
            <td class="font-semibold">{{ row.state }}</td>
            <td><code v-for="t in row.tokens" :key="t">{{ t }}</code></td>
            <td><code v-for="v in row.values" :key="v">{{ v }}</code></td>
            <td>
              <SFChip
                v-model="selected"
                :variant="'multi-select'"
                :item="row.item"
                :disabled="row.state === 'Disabled'"
                :input-aria-label="row.state"
              >Label</SFChip>
            </td>
            <td>{{ row.usage }}</td>
          </tr>
        </tbody>
      </table>`,
  }),
}

export const ChoiceStateMatrix: Story = {
  render: () => ({
    components: { SFChip },
    setup() {
      const selected = ref<string>('selected-row')
      const rows = [
        {
          state: 'Enabled',
          tokens: [
            'bg-gray-200',
            'rounded-xl',
            'h-11',
            'px-8',
            'text-secondary',
            'text-md',
            'font-semibold',
          ],
          values: ['#F2F2F2', '12px', '44px', '32px', '#666666', '14px'],
          usage: 'Two-choice picker',
          item: 'enabled-row',
        },
        {
          state: 'Hover',
          tokens: [
            'bg-white',
            'border-gray-400',
            'border-1',
            'shadow-input',
            'text-primary',
          ],
          values: ['#FFFFFF', '#D9D9D9', '1px', 'shadow-input', '#171717'],
          usage: 'Hover this preview cell to see the state',
          item: 'hover-row',
        },
        {
          state: 'Selected',
          tokens: ['bg-white', 'border-primary', 'border-2', 'text-primary'],
          values: ['#FFFFFF', '#171717', '2px', '#171717'],
          usage: 'Two-choice picker',
          item: 'selected-row',
        },
        {
          state: 'Disabled',
          tokens: [
            'bg-gray-100',
            'border-gray-300',
            'border-1',
            'text-gray-500',
            'font-normal',
          ],
          values: ['#FAFAFA', '#EBEBEB', '1px', '#A8A8A8'],
          usage: 'Two-choice picker',
          item: 'disabled-row',
        },
      ]
      return { selected, rows }
    },
    template: `
      <table :class="'${matrixTableCls}'">
        <thead><tr><th>State</th><th>Token(s)</th><th>Value(s)</th><th>Preview</th><th>Usage</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.state">
            <td class="font-semibold">{{ row.state }}</td>
            <td><code v-for="t in row.tokens" :key="t">{{ t }}</code></td>
            <td><code v-for="v in row.values" :key="v">{{ v }}</code></td>
            <td>
              <SFChip
                v-model="selected"
                :variant="'choice'"
                :item="row.item"
                :disabled="row.state === 'Disabled'"
                :input-aria-label="row.state"
              >Label</SFChip>
            </td>
            <td>{{ row.usage }}</td>
          </tr>
        </tbody>
      </table>`,
  }),
}

export const DismissableStateMatrix: Story = {
  render: () => ({
    components: { SFChip },
    setup() {
      const rows = [
        {
          state: 'Voucher / Enabled',
          tokens: [
            'bg-status-info',
            'rounded-md',
            'h-7',
            'pl-3',
            'pr-2',
            'gap-1',
            'text-primary',
            'text-sm',
            'font-semibold',
          ],
          values: [
            '#CCBFF6',
            '6px',
            '28px',
            '12px',
            '8px',
            '4px',
            '#171717',
            '12px',
          ],
          subType: ChipSubType.VOUCHER,
          disabled: false,
        },
        {
          state: 'Voucher / Hover',
          tokens: [
            'bg-white',
            'border-gray-400',
            'border-1',
            'shadow-input',
            'text-primary',
          ],
          values: ['#FFFFFF', '#D9D9D9', '1px', 'shadow-input', '#171717'],
          subType: ChipSubType.VOUCHER,
          disabled: false,
          usage: 'Hover this preview cell to see the state',
        },
        {
          state: 'Voucher / Disabled',
          tokens: [
            'bg-gray-100',
            'border-gray-300',
            'border-1',
            'text-gray-500',
            'font-normal',
          ],
          values: ['#FAFAFA', '#EBEBEB', '1px', '#A8A8A8'],
          subType: ChipSubType.VOUCHER,
          disabled: true,
        },
        {
          state: 'Promotion / Enabled',
          tokens: [
            'bg-promotion',
            'rounded-md',
            'h-7',
            'pl-3',
            'pr-2',
            'gap-1',
            'text-primary',
            'text-sm',
            'font-semibold',
          ],
          values: [
            '#AEECEF',
            '6px',
            '28px',
            '12px',
            '8px',
            '4px',
            '#171717',
            '12px',
          ],
          subType: ChipSubType.PROMOTION,
          disabled: false,
        },
        {
          state: 'Promotion / Hover',
          tokens: [
            'bg-promotion',
            'border-primary',
            'border-1',
            'shadow-input',
            'text-primary',
          ],
          values: ['#AEECEF', '#171717', '1px', 'shadow-input', '#171717'],
          subType: ChipSubType.PROMOTION,
          disabled: false,
          usage: 'Hover this preview cell to see the state',
        },
        {
          state: 'Promotion / Disabled',
          tokens: [
            'bg-gray-100',
            'border-gray-300',
            'border-1',
            'text-gray-500',
            'font-normal',
          ],
          values: ['#FAFAFA', '#EBEBEB', '1px', '#A8A8A8'],
          subType: ChipSubType.PROMOTION,
          disabled: true,
        },
      ]
      const dismissed = ref<Set<string>>(new Set())
      const onDismiss = (key: string) => dismissed.value.add(key)
      return { rows, dismissed, onDismiss }
    },
    template: `
      <table :class="'${matrixTableCls}'">
        <thead><tr><th>State</th><th>Token(s)</th><th>Value(s)</th><th>Preview</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.state">
            <td class="font-semibold">{{ row.state }}</td>
            <td><code v-for="t in row.tokens" :key="t">{{ t }}</code></td>
            <td><code v-for="v in row.values" :key="v">{{ v }}</code></td>
            <td>
              <span v-if="dismissed.has(row.state)" class="text-sm italic text-gray-500">dismissed</span>
              <SFChip
                v-else
                :variant="'dismissable'"
                :sub-type="row.subType"
                :item="row.state"
                :disabled="row.disabled"
                @dismiss="onDismiss(row.state)"
              >Label</SFChip>
            </td>
          </tr>
        </tbody>
      </table>`,
  }),
}
