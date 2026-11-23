import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconChevronRight from '@assets/icons/navigation/right.svg'
import { DropdownOptionSize, DropdownOptionType } from '@client/utils/constants'
import SFDropdownOptionItem from './SFDropdownOptionItem.vue'

/**
 * SFDropdownOptionItem is the row primitive used inside an open SFDropdown panel.
 * It mirrors the Figma `Dropdown options item` component set: three `type` axes
 * (default, leading-radio, trailing-icon) and two sizes (sm, lg). Trailing content
 * is slot-only; consumers provide their own markup via `#trailing`.
 * The component is presentational — the parent dropdown owns the selection model
 * and emits its `select` event to propagate clicks.
 */
const meta = {
  title: 'UI/Form/SFDropdownOptionItem',
  component: SFDropdownOptionItem,
  parameters: { layout: 'centered' },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: Object.values(DropdownOptionType),
    },
    size: {
      control: { type: 'select' },
      options: Object.values(DropdownOptionSize),
    },
  },
} satisfies Meta<typeof SFDropdownOptionItem>

export default meta

type Story = StoryObj<typeof SFDropdownOptionItem>

const wrapper = (slot: string) => `
  <ul role="listbox" aria-label="Options" class="w-80 rounded-lg border border-gray-400 bg-white p-2">
    ${slot}
  </ul>
`

/** Default option — single text label, no leading/trailing affordances. */
export const Default: Story = {
  args: {
    type: DropdownOptionType.DEFAULT,
    size: DropdownOptionSize.SM,
  },
  render: (args) => ({
    components: { SFDropdownOptionItem },
    setup: () => ({ args }),
    template: wrapper(
      `<SFDropdownOptionItem v-bind="args">Option</SFDropdownOptionItem>`,
    ),
  }),
}

/** Hover preview — focus the row visually to mimic the Figma hover token. */
export const Hover: Story = {
  ...Default,
  render: (args) => ({
    components: { SFDropdownOptionItem },
    setup: () => ({ args }),
    template: wrapper(
      `<SFDropdownOptionItem v-bind="args" class="bg-gray-200 text-primary">Option</SFDropdownOptionItem>`,
    ),
  }),
}

/** Selected state with no leading radio. */
export const Selected: Story = {
  args: {
    type: DropdownOptionType.DEFAULT,
    size: DropdownOptionSize.SM,
    selected: true,
  },
  render: (args) => ({
    components: { SFDropdownOptionItem },
    setup: () => ({ args }),
    template: wrapper(
      `<SFDropdownOptionItem v-bind="args">Selected option</SFDropdownOptionItem>`,
    ),
  }),
}

/** Disabled state — muted text, non-interactive. */
export const Disabled: Story = {
  args: {
    type: DropdownOptionType.DEFAULT,
    size: DropdownOptionSize.SM,
    disabled: true,
  },
  render: (args) => ({
    components: { SFDropdownOptionItem },
    setup: () => ({ args }),
    template: wrapper(
      `<SFDropdownOptionItem v-bind="args">Disabled option</SFDropdownOptionItem>`,
    ),
  }),
}

/** Leading radio — radio circle on the left, filled when `selected`. */
export const LeadingRadio: Story = {
  args: {
    type: DropdownOptionType.LEADING_RADIO,
    size: DropdownOptionSize.SM,
  },
  render: (args) => ({
    components: { SFDropdownOptionItem },
    setup: () => ({ args }),
    template: wrapper(`
      <SFDropdownOptionItem v-bind="args">Option</SFDropdownOptionItem>
      <SFDropdownOptionItem v-bind="args" selected>Selected option</SFDropdownOptionItem>
      <SFDropdownOptionItem v-bind="args" disabled>Disabled option</SFDropdownOptionItem>
    `),
  }),
}

/** Trailing icon — icon slot on the right (defaults to a chevron-right). */
export const TrailingIcon: Story = {
  args: {
    type: DropdownOptionType.TRAILING_ICON,
    size: DropdownOptionSize.SM,
  },
  render: (args) => ({
    components: { SFDropdownOptionItem, IconChevronRight },
    setup: () => ({ args }),
    template: wrapper(`
      <SFDropdownOptionItem v-bind="args">
        Option
        <template #trailing><IconChevronRight class="size-3" /></template>
      </SFDropdownOptionItem>
      <SFDropdownOptionItem v-bind="args" selected>
        Selected option
        <template #trailing><IconChevronRight class="size-3" /></template>
      </SFDropdownOptionItem>
    `),
  }),
}

/** Full matrix: every type × state at both sizes, mirroring the Figma reference page. */
export const Matrix: Story = {
  render: () => ({
    components: { SFDropdownOptionItem, IconChevronRight },
    setup: () => ({
      types: Object.values(DropdownOptionType),
      sizes: Object.values(DropdownOptionSize),
    }),
    template: `
      <div class="flex flex-col gap-8">
        <div v-for="size in sizes" :key="size" class="flex flex-col gap-4">
          <h3 class="text-md font-semibold capitalize">Size: {{ size }}</h3>
          <div class="grid grid-cols-3 gap-4">
            <div v-for="type in types" :key="type" class="flex flex-col gap-2">
              <h4 class="text-sm text-secondary capitalize">{{ type }}</h4>
              <ul role="listbox" aria-label="Options" class="w-60 rounded-lg border border-gray-400 bg-white p-2 flex flex-col gap-1">
                <SFDropdownOptionItem :type="type" :size="size">
                  Enabled
                  <template #trailing v-if="type === 'trailing-icon'"><IconChevronRight class="size-3" /></template>
                </SFDropdownOptionItem>
                <SFDropdownOptionItem :type="type" :size="size" selected>
                  Selected
                  <template #trailing v-if="type === 'trailing-icon'"><IconChevronRight class="size-3" /></template>
                </SFDropdownOptionItem>
                <SFDropdownOptionItem :type="type" :size="size" disabled>
                  Disabled
                  <template #trailing v-if="type === 'trailing-icon'"><IconChevronRight class="size-3" /></template>
                </SFDropdownOptionItem>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
}
