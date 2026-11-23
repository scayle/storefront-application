import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFRadioBase from './SFRadioBase.vue'

// Storybook's `Meta` rejects a generic component as `component`
// (https://github.com/storybookjs/storybook/issues/24238), so that field is typed separately.
// Arg value types are still checked, but an unknown arg name is not.
type SFRadioBaseMeta = Omit<Meta<typeof SFRadioBase>, 'component'> & {
  component: typeof SFRadioBase
}

const radioSizes = ['sm', 'md', 'lg'] as const

/**
 * SFRadioBase is the bare radio circle (no label). By default it renders an
 * interactive native `<input type="radio">`. In `decorative` mode it renders a
 * non-interactive visual only — used as the leading affordance inside a
 * `SFDropdownOptionItem` whose `<li role="option">` owns selection.
 */
export default {
  title: 'UI/Form/SFRadioBase',
  component: SFRadioBase,
  parameters: { layout: 'centered' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    size: {
      control: { type: 'select' },
      options: radioSizes,
    },
  },
  args: {
    id: 'radio-base-default',
    disabled: false,
    invalid: false,
    size: 'md',
  },
} satisfies SFRadioBaseMeta

type Story = StoryObj<typeof SFRadioBase>

const renderWithModel = (selected: boolean) => (args: Story['args']) => ({
  components: { SFRadioBase },
  setup() {
    const model = ref(selected ? 'a' : undefined)
    return { args, model }
  },
  template: `
    <SFRadioBase v-bind="args" v-model="model" value="a" />
    <label :for="args.id" class="sr-only">Example option</label>
  `,
})

/** Unselected, enabled. */
export const Unselected: Story = { render: renderWithModel(false) }

/** Selected, enabled. */
export const Selected: Story = { render: renderWithModel(true) }

/** Invalid (unselected). */
export const Invalid: Story = {
  render: renderWithModel(false),
  args: { invalid: true },
}

/** Disabled selected — filled background with a muted dot. */
export const DisabledSelected: Story = {
  render: renderWithModel(true),
  args: { disabled: true },
}

/**
 * Decorative (non-interactive) — no native input, checked appearance driven by
 * the `checked` prop. This is how the dropdown option renders its radio.
 */
export const Decorative: Story = {
  render: () => ({
    components: { SFRadioBase },
    template: `
      <div class="flex items-center gap-6 p-4">
        <SFRadioBase decorative size="sm" :checked="false" />
        <SFRadioBase decorative size="sm" :checked="true" />
        <SFRadioBase decorative size="sm" :checked="true" disabled />
      </div>
    `,
  }),
}

/** Small, medium, and large sizes. */
export const Sizes: Story = {
  render: () => ({
    components: { SFRadioBase },
    setup() {
      const model = ref('md')
      return { model, radioSizes }
    },
    template: `
      <div class="flex items-center gap-6 p-4">
        <template v-for="size in radioSizes" :key="size">
          <SFRadioBase
            :id="'radio-size-' + size"
            v-model="model"
            :value="size"
            :size="size"
          />
          <label :for="'radio-size-' + size" class="sr-only">{{ size }}</label>
        </template>
      </div>
    `,
  }),
}

/**
 * Selection × state matrix mirroring the Figma "States" table. The focus rows
 * reproduce the focus ring statically (a real control only shows it on keyboard
 * focus); tab to any control to preview the live `:focus-visible` ring. Hover is
 * interactive — hover over a control to preview it.
 */
export const Matrix: Story = {
  render: () => ({
    components: { SFRadioBase },
    setup() {
      const states = [
        { key: 'enabled', label: 'Enabled', props: {} },
        { key: 'focus', label: 'Focus', props: {}, focusRing: true },
        { key: 'invalid', label: 'Invalid', props: { invalid: true } },
        {
          key: 'invalid-focus',
          label: 'Invalid Focus',
          props: { invalid: true },
          focusRing: true,
        },
        { key: 'disabled', label: 'Disabled', props: { disabled: true } },
      ]
      const selections = [
        { key: 'unselected', label: 'Unselected', selected: false },
        { key: 'selected', label: 'Selected', selected: true },
      ]
      return { states, selections }
    },
    template: `
      <div
        class="grid items-center gap-6 p-4"
        style="grid-template-columns: 120px repeat(2, 1fr);"
      >
        <div></div>
        <div v-for="sel in selections" :key="sel.key" class="text-sm text-secondary">
          {{ sel.label }}
        </div>
        <template v-for="state in states" :key="state.key">
          <div class="text-sm text-secondary">{{ state.label }}</div>
          <div v-for="sel in selections" :key="state.key + sel.key">
            <span
              class="inline-flex rounded-full"
              :class="{ 'focus-style': state.focusRing }"
            >
              <SFRadioBase
                :id="'matrix-' + state.key + '-' + sel.key"
                :model-value="sel.selected ? 'a' : undefined"
                value="a"
                v-bind="state.props"
              />
              <label
                :for="'matrix-' + state.key + '-' + sel.key"
                class="sr-only"
              >
                {{ state.label }}, {{ sel.label }}
              </label>
            </span>
          </div>
        </template>
      </div>
    `,
  }),
}
