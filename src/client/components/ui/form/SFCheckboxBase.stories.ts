import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { Size } from '@client/utils/constants'
import SFCheckboxBase from './SFCheckboxBase.vue'

// Storybook's `Meta` rejects a generic component as `component`
// (https://github.com/storybookjs/storybook/issues/24238), so that field is typed separately.
// Arg value types are still checked, but an unknown arg name is not.
type SFCheckboxBaseMeta = Omit<Meta<typeof SFCheckboxBase>, 'component'> & {
  component: typeof SFCheckboxBase
}

const checkboxSizes = [Size.SM, Size.MD, Size.LG] as const

/**
 * SFCheckboxBase is the bare checkbox square from the design system.
 * Use it inside custom layouts or compose it via `SFCheckbox` when a label is needed.
 */
export default {
  title: 'UI/Form/SFCheckboxBase',
  component: SFCheckboxBase,
  parameters: { layout: 'centered' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    size: {
      control: { type: 'select' },
      options: checkboxSizes,
    },
  },
  args: {
    id: 'checkbox-base',
    disabled: false,
    invalid: false,
    size: Size.MD,
  },
} satisfies SFCheckboxBaseMeta

type Story = StoryObj<typeof SFCheckboxBase>

const renderWithModel = (checked: boolean) => (args: Story['args']) => ({
  components: { SFCheckboxBase },
  setup() {
    const model = ref(checked)
    return { args, model }
  },
  template: `
    <SFCheckboxBase v-bind="args" v-model="model" />
    <label :for="args.id" class="sr-only">Example option</label>
  `,
})

/** Unchecked, enabled resting state. */
export const UncheckedEnabled: Story = {
  render: renderWithModel(false),
  args: { id: 'checkbox-base-unchecked' },
}

/** Checked, enabled resting state. */
export const CheckedEnabled: Story = {
  render: renderWithModel(true),
  args: { id: 'checkbox-base-checked' },
}

/** Disabled unchecked state. */
export const UncheckedDisabled: Story = {
  render: renderWithModel(false),
  args: { id: 'checkbox-base-disabled', disabled: true },
}

/** Disabled checked state. */
export const CheckedDisabled: Story = {
  render: renderWithModel(true),
  args: { id: 'checkbox-base-checked-disabled', disabled: true },
}

/** Invalid unchecked state. */
export const UncheckedInvalid: Story = {
  render: renderWithModel(false),
  args: { id: 'checkbox-base-invalid', invalid: true },
}

/** Small, medium, and large checkbox sizes side by side. */
export const Sizes: Story = {
  render: () => ({
    components: { SFCheckboxBase },
    setup() {
      const sm = ref(true)
      const md = ref(true)
      const lg = ref(true)
      return { sm, md, lg, Size }
    },
    template: `
      <div class="flex items-center gap-6 p-4">
        <SFCheckboxBase id="checkbox-base-sm" v-model="sm" :size="Size.SM" />
        <label for="checkbox-base-sm" class="sr-only">Small</label>
        <SFCheckboxBase id="checkbox-base-md" v-model="md" :size="Size.MD" />
        <label for="checkbox-base-md" class="sr-only">Medium</label>
        <SFCheckboxBase id="checkbox-base-lg" v-model="lg" :size="Size.LG" />
        <label for="checkbox-base-lg" class="sr-only">Large</label>
      </div>
    `,
  }),
}

/** Invalid checked state. */
export const CheckedInvalid: Story = {
  render: renderWithModel(true),
  args: { id: 'checkbox-base-checked-invalid', invalid: true },
}

/**
 * Matrix of selection × state combinations from the Figma Checkbox base spec.
 */
export const StateMatrix: Story = {
  render: () => ({
    components: { SFCheckboxBase },
    setup() {
      const rows = ref(
        [
          { id: 'enabled', label: 'Enabled', disabled: false, invalid: false },
          { id: 'hover', label: 'Hover', disabled: false, invalid: false },
          { id: 'focus', label: 'Focus', disabled: false, invalid: false },
          { id: 'invalid', label: 'Invalid', disabled: false, invalid: true },
          {
            id: 'invalid-focus',
            label: 'Invalid focus',
            disabled: false,
            invalid: true,
          },
          { id: 'disabled', label: 'Disabled', disabled: true, invalid: false },
        ].map((row) => ({ ...row, unchecked: false, checked: true })),
      )
      return { rows }
    },
    template: `
      <div class="flex flex-col gap-6 p-4">
        <div class="grid grid-cols-[8rem_1fr_1fr] items-center gap-4">
          <span />
          <span class="text-sm font-semibold text-secondary">Unchecked</span>
          <span class="text-sm font-semibold text-secondary">Checked</span>
          <template v-for="row in rows" :key="row.id">
            <span class="text-sm text-secondary">{{ row.label }}</span>
            <span>
              <SFCheckboxBase
                :id="'matrix-u-' + row.id"
                v-model="row.unchecked"
                :disabled="row.disabled"
                :invalid="row.invalid"
              />
              <label :for="'matrix-u-' + row.id" class="sr-only">
                {{ row.label }}, unchecked
              </label>
            </span>
            <span>
              <SFCheckboxBase
                :id="'matrix-c-' + row.id"
                v-model="row.checked"
                :disabled="row.disabled"
                :invalid="row.invalid"
              />
              <label :for="'matrix-c-' + row.id" class="sr-only">
                {{ row.label }}, checked
              </label>
            </span>
          </template>
        </div>
        <p class="text-sm text-secondary">
          Tab into a control to preview focus. Hover rows require a hover-capable pointer.
        </p>
      </div>
    `,
  }),
}
