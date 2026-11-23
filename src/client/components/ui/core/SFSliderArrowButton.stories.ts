import type { StoryObj, Meta } from '@storybook/vue3-vite'
import SFSliderArrowButton from './SFSliderArrowButton.vue'

/**
 * SFSliderArrowButton is the shared prev/next chevron used by `SFImageGallery`
 * and `SFImageStrip`. It owns the chevron styling, icon and accessible label;
 * the consumer supplies the positioning classes and decides whether to set
 * `controls` (carousel chrome) or leave it unset (a plain scroll list).
 */
export default {
  title: 'UI/Core/SFSliderArrowButton',
  component: SFSliderArrowButton,
  parameters: { layout: 'centered' },
  argTypes: {
    direction: { control: 'select', options: ['previous', 'next'] },
    disabled: { control: 'boolean' },
    accessibleLabel: { control: 'text' },
  },
  args: {
    direction: 'previous',
    disabled: false,
    accessibleLabel: 'Previous',
  },
} satisfies Meta<typeof SFSliderArrowButton>

type Story = StoryObj<typeof SFSliderArrowButton>

const render = (args: Story['args']) => ({
  components: { SFSliderArrowButton },
  setup() {
    return { args }
  },
  template: `
    <div class="p-4">
      <SFSliderArrowButton v-bind="args" class="rounded-r-full pr-1" />
    </div>
  `,
})

/** Previous — left chevron, rounded on the outer (left) side. */
export const Previous: Story = { render }

/** Next — right chevron. */
export const Next: Story = {
  args: { direction: 'next', accessibleLabel: 'Next' },
  render: (args) => ({
    components: { SFSliderArrowButton },
    setup() {
      return { args }
    },
    template: `
      <div class="p-4">
        <SFSliderArrowButton v-bind="args" class="rounded-l-full pl-1" />
      </div>
    `,
  }),
}

/** Disabled — dimmed via aria-disabled (stays focusable). */
export const Disabled: Story = {
  args: { disabled: true },
  render,
}
