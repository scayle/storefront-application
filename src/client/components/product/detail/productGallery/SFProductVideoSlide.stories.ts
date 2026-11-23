import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFProductVideoSlide from './SFProductVideoSlide.vue'

/**
 * SFProductVideoSlide plays one product video in the PDP gallery. The video
 * stays poster-only until `isPlaying` is true, then autoplays muted and loops.
 * When `isPlaying` turns false, playback pauses and rewinds to the start.
 */
export default {
  title: 'Product/Detail/Product Gallery/SFProductVideoSlide',
  component: SFProductVideoSlide,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductVideoSlide>) => ({
    components: { SFProductVideoSlide },
    setup() {
      return { args }
    },
    template: `
      <div class="w-full max-w-md">
        <SFProductVideoSlide v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFProductVideoSlide>

type Story = StoryObj<typeof SFProductVideoSlide>

/** Storybook static assets (`.storybook/assets/`), same as CMS Video stories. */
const storybookVideoUrl = 'video.mp4'
const storybookPosterUrl = 'desktopImage.avif'

/**
 * Playing slide: the video loads and autoplays muted over the poster.
 */
export const Playing: Story = {
  args: {
    url: storybookVideoUrl,
    posterUrl: storybookPosterUrl,
    alt: 'Product video',
    isPlaying: true,
  },
}

/**
 * Paused slide: the poster fills the reserved 3/4 frame, with no network
 * request for the video until play is requested.
 */
export const Paused: Story = {
  args: {
    url: storybookVideoUrl,
    posterUrl: storybookPosterUrl,
    alt: 'Product video',
    isPlaying: false,
  },
}
