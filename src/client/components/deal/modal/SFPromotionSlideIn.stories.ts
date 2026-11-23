import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { Campaign, Promotion } from '@scayle/storefront/types'
import { DAY_MS } from '@client/utils/time'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFPromotionSlideIn from './SFPromotionSlideIn.vue'

const schedule = {
  from: new Date(Date.now()).toISOString(),
  to: new Date(Date.now() + 3 * DAY_MS).toISOString(),
}

const automaticDiscount: Promotion = {
  id: 'automatic-discount',
  name: 'Dress Up & Save',
  priority: 1,
  headline: 'Dress Up & Save!',
  subline: 'Get any 3 dresses for a fixed price of just $50.',
  link: '',
  hideCountdown: false,
  conditions: 'Add three eligible dresses to your basket.',
  color: { backgroundColor: '#FFC65F', color: '#171717' },
  schedule,
  effect: {
    type: 'automatic_discount',
    discountType: 'absolute',
    value: '$50',
  },
}

const freeGift: Promotion = {
  id: 'free-gift',
  name: 'Free Socks',
  priority: 2,
  headline: 'Buy Shoes, Get Free Socks',
  subline: 'Buy any pair of shoes and receive a free pair of socks.',
  link: '',
  hideCountdown: false,
  conditions: 'Add any pair of shoes to your basket.',
  color: { backgroundColor: '#aeecef', color: '#171717' },
  schedule,
  effect: {
    type: 'buy_x_get_y',
    eligibleItemsQuantity: 1,
    variantIds: [1],
    applicableItemSelectionType: 'variant_ids',
    discountType: 'relative',
    value: '-100%',
    isFree: true,
  },
}

const campaign: Campaign = {
  id: 'summer-sale',
  key: 'summer-sale',
  name: 'Summer Sale',
  reduction: 20,
  headline: 'Summer Sale',
  subline: 'Up to 20% off selected items.',
  link: '',
  hideCountdown: false,
  conditions: 'The reduction is already applied to the shown prices.',
  color: { backgroundColor: '#d42411', color: '#FFFFFF' },
  schedule,
}

/**
 * SFPromotionSlideIn lists every deal currently active in the shop. The layout
 * mounts it once and opens it from the deals button in the header, so the user
 * can compare the campaign and the promotions in one place.
 *
 * Key features:
 * - Shows the campaign first, without its text box, then one `SFDealBanner`
 *   per promotion with its conditions
 * - Reports each banner's position in the whole deal set, counting the campaign
 * - Falls back to a short message when no deal is active
 *
 * Each story opens the slide-in in its play function. The slide-in is a modal
 * dialog, so on the docs page it stays closed until the button is used.
 */
export default {
  title: 'Deal/Modal/SFPromotionSlideIn',
  component: SFPromotionSlideIn,
  parameters: { layout: 'centered' },
  args: {
    open: false,
  },
  argTypes: {
    open: { control: false },
  },
  render: (args: ComponentPropsAndSlots<typeof SFPromotionSlideIn>) => ({
    components: { SFPromotionSlideIn, SFButton },
    setup() {
      const isOpen = ref(args.open ?? false)
      return { args, isOpen }
    },
    template: `
      <SFButton @click="isOpen = true">Show deals</SFButton>
      <SFPromotionSlideIn
        v-bind="args"
        v-model:open="isOpen"
      />
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Show deals' }))
    await waitFor(() => expect(canvas.getByRole('dialog')).toBeVisible())
  },
} satisfies Meta<typeof SFPromotionSlideIn>

type Story = StoryObj<typeof SFPromotionSlideIn>

/** Two promotions and no campaign: a discount and a free gift. */
export const Promotions: Story = {
  args: {
    promotions: [automaticDiscount, freeGift],
    campaign: null,
  },
}

/**
 * A campaign next to the promotions. The campaign card comes first and leaves
 * out the text box, since the campaign has already reduced the shown prices.
 */
export const CampaignAndPromotions: Story = {
  args: {
    promotions: [automaticDiscount, freeGift],
    campaign,
  },
}

/** No active deal: the slide-in says so instead of listing banners. */
export const Empty: Story = {
  args: {
    promotions: [],
    campaign: null,
  },
}
