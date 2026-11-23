import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFRecentlyViewedProductSlider from './SFRecentlyViewedProductSlider.vue'

/**
 * SFRecentlyViewedProductSlider displays the products the current user has
 * previously viewed in a horizontal slider. Product ids are persisted in
 * localStorage via `useRecentlyViewedProducts`, and the slider lazy-loads the
 * missing product data on mount.
 *
 * Used by the CMS provider wrappers (Contentful, Storyblok, Contentstack) and
 * the Product Detail page.
 *
 * @see {@link ./SFProductSlider.stories.ts} - Underlying slider with detailed examples.
 */
export default {
  title: 'Product/Slider/SFRecentlyViewedProductSlider',
  component: SFRecentlyViewedProductSlider,
  parameters: {
    docs: {
      description: {
        component:
          'Displays recently viewed products from localStorage in a horizontal slider. Wraps SFProductSlider and is shared by the CMS provider wrappers and the Product Detail page.',
      },
    },
  },
  render: () => ({
    components: { SFRecentlyViewedProductSlider },
    setup() {
      // Seed localStorage so the global RPC mock returns mock product data.
      localStorage.setItem(
        '1-recently-viewed-products',
        JSON.stringify([1, 2, 3, 4, 5]),
      )
      return {}
    },
    template: `
      <div class="w-full">
        <SFRecentlyViewedProductSlider />
      </div>
    `,
  }),
} satisfies Meta<typeof SFRecentlyViewedProductSlider>

type Story = StoryObj<typeof SFRecentlyViewedProductSlider>

export const Default: Story = {}
