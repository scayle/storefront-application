import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { Size } from '@client/utils/constants'
import SFCheckbox from './SFCheckbox.vue'

// Storybook's `Meta` rejects a generic component as `component`
// (https://github.com/storybookjs/storybook/issues/24238), so that field is typed separately.
// Arg value types are still checked, but an unknown arg name is not.
type SFCheckboxMeta = Omit<Meta<typeof SFCheckbox>, 'component'> & {
  component: typeof SFCheckbox
}

const checkboxSizes = [Size.SM, Size.MD, Size.LG] as const

/**
 * SFCheckbox composes `SFCheckboxBase` with label and optional helper, info, or error
 * messages. It supports boolean `v-model` and multi-select array values.
 */
export default {
  title: 'UI/Form/SFCheckbox',
  component: SFCheckbox,
  parameters: { layout: 'centered' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    helperText: { control: 'text' },
    infoText: { control: 'text' },
    errorText: { control: 'text' },
    size: {
      control: { type: 'select' },
      options: checkboxSizes,
    },
  },
  args: {
    id: 'checkbox-default',
    label: 'Accept terms and conditions',
    disabled: false,
    invalid: false,
    size: Size.MD,
  },
} satisfies SFCheckboxMeta

type Story = StoryObj<typeof SFCheckbox>

const renderWithModel = (args: Story['args']) => ({
  components: { SFCheckbox },
  setup() {
    const model = ref(false)
    return { args, model }
  },
  template: `<SFCheckbox v-bind="args" v-model="model" />`,
})

/** Label only, unchecked. */
export const Default: Story = {
  render: renderWithModel,
}

/** Label only, checked. */
export const Checked: Story = {
  render: (args) => ({
    components: { SFCheckbox },
    setup() {
      const model = ref(true)
      return { args, model }
    },
    template: `<SFCheckbox v-bind="args" v-model="model" />`,
  }),
}

/** Small, medium, and large checkbox sizes with labels. */
export const Sizes: Story = {
  render: () => ({
    components: { SFCheckbox },
    setup() {
      const sm = ref(true)
      const md = ref(true)
      const lg = ref(true)
      return { sm, md, lg, Size }
    },
    template: `
      <div class="flex flex-col gap-4 p-4">
        <SFCheckbox id="checkbox-sm" v-model="sm" label="Size sm" :size="Size.SM" />
        <SFCheckbox id="checkbox-md" v-model="md" label="Size md" :size="Size.MD" />
        <SFCheckbox id="checkbox-lg" v-model="lg" label="Size lg" :size="Size.LG" />
      </div>
    `,
  }),
}

/** Label with helper text below. */
export const WithHelper: Story = {
  render: renderWithModel,
  args: {
    helperText: 'You can change this preference later in account settings.',
  },
}

/** Label with info icon and message. */
export const WithInfo: Story = {
  render: renderWithModel,
  args: {
    infoText: 'We use this preference to personalize your experience.',
  },
}

/** Label with alert icon and error message. */
export const WithError: Story = {
  render: renderWithModel,
  args: {
    errorText: 'You must accept the terms before continuing.',
    invalid: true,
  },
}

/** Disabled unchecked checkbox. */
export const Disabled: Story = {
  render: renderWithModel,
  args: { disabled: true },
}

/** Disabled checked checkbox. */
export const DisabledChecked: Story = {
  render: (args) => ({
    components: { SFCheckbox },
    setup() {
      const model = ref(true)
      return { args, model }
    },
    template: `<SFCheckbox v-bind="args" v-model="model" />`,
  }),
  args: { disabled: true },
}

/**
 * Custom label slot with inline links, as used on registration or checkout forms.
 */
export const CustomLabel: Story = {
  render: (args) => ({
    components: { SFCheckbox },
    setup() {
      const model = ref(false)
      return { args, model }
    },
    template: `
      <SFCheckbox v-bind="args" v-model="model">
        <template #label>
          <span class="text-md font-semibold text-secondary">
            I agree to the
            <a href="#" class="text-accent underline">Terms of Service</a>
            and
            <a href="#" class="text-accent underline">Privacy Policy</a>
          </span>
        </template>
      </SFCheckbox>`,
  }),
  args: {
    id: 'checkbox-custom-label',
    label: undefined,
  },
}

/**
 * Label configuration matrix from the Figma Checkbox spec.
 */
export const LabelMatrix: Story = {
  render: () => ({
    components: { SFCheckbox },
    setup() {
      const configs = [
        { label: 'Label only', props: {} },
        {
          label: 'Label + Helper',
          props: { helperText: 'Supporting description text.' },
        },
        {
          label: 'Label + Info',
          props: { infoText: 'Additional context for this option.' },
        },
        {
          label: 'Label + Error',
          props: {
            errorText: 'This field requires your attention.',
            invalid: true,
          },
        },
      ]
      const models = configs.map(() => ref(false))
      return { configs, models }
    },
    template: `
      <div class="flex max-w-md flex-col gap-8 p-4">
        <SFCheckbox
          v-for="(config, index) in configs"
          :key="config.label"
          :id="'label-matrix-' + index"
          v-model="models[index]"
          :label="config.label"
          v-bind="config.props"
        />
      </div>
    `,
  }),
}
