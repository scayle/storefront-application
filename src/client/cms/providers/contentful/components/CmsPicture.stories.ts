import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CmsPicture from './CmsPicture.vue'

/**
 * `CmsPicture` renders the desktop and mobile `<source>` candidates shared by
 * every CMS image block. Callers supply the fallback `<img>` through the
 * default slot, since loading priority, error handling, and alt text differ
 * per block.
 */
export default {
  title: 'CMS Contentful/CmsPicture',
  component: CmsPicture,
} satisfies Meta<typeof CmsPicture>

type Story = StoryObj<typeof CmsPicture>

/** Desktop and mobile AVIF sources with a slotted fallback `<img>`. */
export const Default: Story = {
  args: {
    desktopSources: [
      {
        type: 'image/avif',
        sizes: '100vw',
        srcset: 'https://placehold.co/1280x720.avif 1280w',
      },
    ],
    mobileSources: [
      {
        type: 'image/avif',
        sizes: '100vw',
        srcset: 'https://placehold.co/640x360.avif 640w',
      },
    ],
  },
  render: (args) => ({
    components: { CmsPicture },
    setup: () => ({ args }),
    template: `
      <CmsPicture v-bind="args">
        <img src="https://placehold.co/640x360" alt="Placeholder" class="size-full object-cover" />
      </CmsPicture>
    `,
  }),
}
