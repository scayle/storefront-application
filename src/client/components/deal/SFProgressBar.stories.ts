import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import SFProgressBar from './SFProgressBar.vue'

/**
 * SFProgressBar renders a horizontal progress bar with optional milestone markers.
 * Used in deal banners and tiered promotions to show progress toward the next reward tier.
 *
 * Key features:
 * - Progress value from 0 to 100
 * - Optional custom bar color (defaults to primary theme color)
 * - Optional milestones: markers with title and subtitle at given percent positions
 * - Milestone markers are filled when progress has reached that percent
 */
export default {
  title: 'Deal/SFProgressBar',
  component: SFProgressBar,
  parameters: { layout: 'centered' },
  argTypes: {
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description:
        'Current progress as a percentage (0–100). Drives bar fill and which milestones appear filled.',
    },
    ariaLabel: {
      description:
        'Accessible name of the native progress element. Pass the text that explains what the bar tracks.',
    },
    color: {
      control: 'color',
      description:
        'Color for the filled bar and for filled milestone markers. Falls back to theme primary.',
    },
    milestones: {
      description:
        'Optional list of markers. Each has percent (0–1), title, and subtitle. Shown above the bar.',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFProgressBar>) => ({
    components: { SFProgressBar },
    setup() {
      return { args }
    },
    template: '<div class="max-w-112"><SFProgressBar v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SFProgressBar>

type Story = StoryObj<typeof SFProgressBar>

/** Basic progress bar at 50% with no milestones. */
export const Default: Story = {
  args: {
    progress: 50,
  },
}

/** Progress bar with tier-style milestones. First tier reached, others not yet. */
export const WithMilestonesFirstTier: Story = {
  args: {
    progress: 40,
    milestones: [
      { percent: 1 / 3, title: '$100', subtitle: '-10%' },
      { percent: 2 / 3, title: '$150', subtitle: '-15%' },
      { percent: 1, title: '$200', subtitle: '-20%' },
    ],
  },
}

/** All milestones reached at 100% progress. */
export const WithMilestonesFull: Story = {
  args: {
    progress: 100,
    milestones: [
      { percent: 1 / 3, title: '$100', subtitle: '-10%' },
      { percent: 2 / 3, title: '$150', subtitle: '-15%' },
      { percent: 1, title: '$200', subtitle: '-20%' },
    ],
  },
}

/** Custom bar color for campaign or brand styling. */
export const CustomColor: Story = {
  args: {
    progress: 65,
    color: '#059669',
    milestones: [
      { percent: 0.5, title: 'Half', subtitle: '50%' },
      { percent: 1, title: 'Done', subtitle: '100%' },
    ],
  },
}
