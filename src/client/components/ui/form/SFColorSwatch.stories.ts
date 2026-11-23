import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFColorSwatch from './SFColorSwatch.vue'

/**
 * SFColorSwatch is a color-filter chip styled as a checkbox.
 * It supports high and low contrast variants and the states defined in Figma.
 */
const meta = {
  title: 'UI/Form/SFColorSwatch',
  component: SFColorSwatch,
  parameters: { layout: 'centered' },
  argTypes: {
    contrast: { control: 'select', options: ['high', 'low'] },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    isChecked: { control: 'boolean' },
  },
  args: {
    id: 'swatch-black',
    color: '#5328e1',
    label: 'Accent',
    contrast: 'high',
    disabled: false,
    invalid: false,
    isChecked: false,
  },
} satisfies Meta<typeof SFColorSwatch>

export default meta
type Story = StoryObj<typeof SFColorSwatch>

/** High contrast dark swatch, unchecked. */
export const HighContrastUnchecked: Story = {
  args: {
    id: 'swatch-hc-off',
    color: '#5328e1',
    label: 'Accent',
    contrast: 'high',
    isChecked: false,
  },
}

/** High contrast dark swatch, checked. */
export const HighContrastChecked: Story = {
  args: {
    id: 'swatch-hc-on',
    color: '#5328e1',
    label: 'Accent',
    contrast: 'high',
    isChecked: true,
  },
}

/** Low contrast light swatch with resting border. */
export const LowContrastUnchecked: Story = {
  args: {
    id: 'swatch-lc-off',
    color: '#ffffff',
    label: 'White',
    contrast: 'low',
    isChecked: false,
  },
}

/** Low contrast light swatch, checked with primary checkmark. */
export const LowContrastChecked: Story = {
  args: {
    id: 'swatch-lc-on',
    color: '#ffffff',
    label: 'White',
    contrast: 'low',
    isChecked: true,
  },
}

/** Multi-color swatch grid for mixed-color filters. */
export const MultiColor: Story = {
  args: {
    id: 'swatch-multi',
    color: ['#0000ff', '#ffa500', '#ff0000', '#008000'],
    label: 'Multi',
    contrast: 'high',
    isChecked: true,
  },
}

/**
 * State matrix for high and low contrast swatches.
 */
export const ContrastMatrix: Story = {
  render: () => ({
    components: { SFColorSwatch },
    setup() {
      const swatches = [
        {
          id: 'matrix-hc',
          color: '#5328e1',
          label: 'High contrast',
          contrast: 'high' as const,
        },
        {
          id: 'matrix-lc',
          color: '#ffffff',
          label: 'Low contrast',
          contrast: 'low' as const,
        },
      ]
      const states = [
        { label: 'Unchecked', checked: false },
        { label: 'Checked', checked: true },
      ]
      return { swatches, states }
    },
    template: `
      <div class="flex flex-col gap-8 p-4">
        <div
          v-for="swatch in swatches"
          :key="swatch.id"
          class="flex flex-col gap-4"
        >
          <span class="text-sm font-semibold text-primary">{{ swatch.label }}</span>
          <div class="flex gap-8">
            <SFColorSwatch
              v-for="state in states"
              :key="state.label"
              :id="swatch.id + '-' + state.label"
              :color="swatch.color"
              :contrast="swatch.contrast"
              :label="state.label"
              :is-checked="state.checked"
            />
          </div>
        </div>
      </div>
    `,
  }),
}
