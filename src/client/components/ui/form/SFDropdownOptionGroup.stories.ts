import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { DropdownOptionType } from '@client/utils/constants'
import SFDropdownOptionGroup from './SFDropdownOptionGroup.vue'
import SFDropdownOptionItem from './SFDropdownOptionItem.vue'

/**
 * SFDropdownOptionGroup renders a labeled section inside the SFDropdown panel.
 * Mirrors the Figma `Dropdown options group` component: a non-interactive header
 * above a list of SFDropdownOptionItem children.
 */
const meta = {
  title: 'UI/Form/SFDropdownOptionGroup',
  component: SFDropdownOptionGroup,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFDropdownOptionGroup>

export default meta

type Story = StoryObj<typeof SFDropdownOptionGroup>

const wrapper = (slot: string) => `
  <ul role="listbox" aria-label="Options" class="w-80 rounded-lg border border-gray-400 bg-white p-2 flex flex-col gap-2">
    ${slot}
  </ul>
`

/** Default group containing three items, one selected. */
export const Default: Story = {
  render: () => ({
    components: { SFDropdownOptionGroup, SFDropdownOptionItem },
    template: wrapper(`
      <SFDropdownOptionGroup label="Group A">
        <SFDropdownOptionItem>Option 1</SFDropdownOptionItem>
        <SFDropdownOptionItem selected>Option 2</SFDropdownOptionItem>
        <SFDropdownOptionItem disabled>Option 3</SFDropdownOptionItem>
      </SFDropdownOptionGroup>
    `),
  }),
}

/** Group containing leading-radio items — the size-select pattern from Figma. */
export const LeadingRadio: Story = {
  render: () => ({
    components: { SFDropdownOptionGroup, SFDropdownOptionItem },
    setup: () => ({ type: DropdownOptionType.LEADING_RADIO }),
    template: wrapper(`
      <SFDropdownOptionGroup label="Size">
        <SFDropdownOptionItem :type="type">S</SFDropdownOptionItem>
        <SFDropdownOptionItem :type="type" selected>M</SFDropdownOptionItem>
        <SFDropdownOptionItem :type="type">L</SFDropdownOptionItem>
        <SFDropdownOptionItem :type="type" disabled>XL</SFDropdownOptionItem>
      </SFDropdownOptionGroup>
    `),
  }),
}

/** Two groups stacked, demonstrating mixed selection states across sections. */
export const MultipleGroups: Story = {
  render: () => ({
    components: { SFDropdownOptionGroup, SFDropdownOptionItem },
    template: wrapper(`
      <SFDropdownOptionGroup label="Recently used">
        <SFDropdownOptionItem selected>Option A</SFDropdownOptionItem>
        <SFDropdownOptionItem>Option B</SFDropdownOptionItem>
      </SFDropdownOptionGroup>
      <SFDropdownOptionGroup label="All options">
        <SFDropdownOptionItem>Option C</SFDropdownOptionItem>
        <SFDropdownOptionItem>Option D</SFDropdownOptionItem>
        <SFDropdownOptionItem disabled>Option E</SFDropdownOptionItem>
      </SFDropdownOptionGroup>
    `),
  }),
}
