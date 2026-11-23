import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { ProductVariant } from '@scayle/storefront/types'
import SFVariantPicker from './SFVariantPicker.vue'

const defaultVariants: ProductVariant[] = [
  {
    id: 1,
    label: 'S',
    stock: 5,
    isLowStock: true,
    isSoldOut: false,
    price: {
      finalPrice: '$ 29.99',
      originalPrice: '$39.99',
      finalPriceInCents: 2999,
      originalPriceInCents: 3999,
      currency: 'EUR',
      isOnSale: false,
      showOriginally: false,
      showLowestPriorPriceLine: false,
      strikeOriginally: false,
      strikeLowestPriorPrice: false,
      hasCampaignReduction: false,
      strikeThroughPrices: [
        {
          value: '-20%',
          category: 'promotion',
          type: 'relative',
          originalPrice: '$39.99',
        },
      ],
    },
  },
  {
    id: 2,
    label: 'M',
    stock: 12,
    isLowStock: false,
    isSoldOut: false,
    price: {
      finalPrice: '$29.99',
      originalPrice: '$29.99',
      finalPriceInCents: 2999,
      originalPriceInCents: 2999,
      currency: 'EUR',
      strikeThroughPrices: [],
      isOnSale: false,
      showOriginally: false,
      showLowestPriorPriceLine: false,
      strikeOriginally: false,
      strikeLowestPriorPrice: false,
      hasCampaignReduction: false,
    },
  },
  {
    id: 3,
    label: 'L',
    stock: 0,
    isLowStock: false,
    isSoldOut: true,
    price: {
      finalPrice: '$29.99',
      originalPrice: '$29.99',
      finalPriceInCents: 2999,
      originalPriceInCents: 2999,
      currency: 'EUR',
      strikeThroughPrices: [],
      isOnSale: false,
      showOriginally: false,
      showLowestPriorPriceLine: false,
      strikeOriginally: false,
      strikeLowestPriorPrice: false,
      hasCampaignReduction: false,
    },
  },
  {
    id: 4,
    label: 'XL',
    stock: 3,
    isLowStock: true,
    isSoldOut: false,
    price: {
      finalPrice: '$34.99',
      originalPrice: '$39.99',
      finalPriceInCents: 3499,
      originalPriceInCents: 3999,
      currency: 'EUR',
      strikeThroughPrices: [],
      isOnSale: false,
      showOriginally: false,
      showLowestPriorPriceLine: false,
      strikeOriginally: false,
      strikeLowestPriorPrice: false,
      hasCampaignReduction: false,
    },
  },
]

/**
 * SFVariantPicker lets users choose a product variant (e.g. size) from a dropdown.
 * It shows variant label, price placeholder, stock state, and marks sold-out options.
 * Used on the product detail page above the add-to-basket actions.
 */
export default {
  title: 'Product/SFVariantPicker',
  component: SFVariantPicker,
  parameters: { layout: 'centered' },
  argTypes: {
    variants: {
      control: { type: 'object' },
    },
    strikeThroughPrice: {
      control: { type: 'boolean' },
    },
    reductionLabel: {
      control: { type: 'text' },
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFVariantPicker>) => ({
    components: { SFVariantPicker },
    setup() {
      const activeVariant = ref<ProductVariant | undefined>(args.variants[0])
      return { args, activeVariant }
    },
    template: `
      <div class="w-64">
        <SFVariantPicker
          class="w-full"
          v-bind="args"
          v-model:active-variant="activeVariant"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof SFVariantPicker>

type Story = StoryObj<typeof SFVariantPicker>

/**
 * Default picker with several sizes: some in stock, one sold out.
 * First variant is selected by default.
 */
export const Default: Story = {
  args: {
    variants: defaultVariants,
  },
}

/**
 * Single variant only. The picker is disabled and shows the only option as selected.
 */
export const SingleVariant: Story = {
  args: {
    variants: [
      {
        id: 1,
        label: 'One size',
        stock: 4,
        isLowStock: true,
        isSoldOut: false,
        price: {
          finalPrice: '$19.99',
          originalPrice: '$19.99',
          finalPriceInCents: 1999,
          originalPriceInCents: 1999,
          currency: 'EUR',
          strikeThroughPrices: [],
          isOnSale: false,
          showOriginally: false,
          showLowestPriorPriceLine: false,
          strikeOriginally: false,
          strikeLowestPriorPrice: false,
          hasCampaignReduction: false,
        },
      },
    ],
  },
}

/**
 * No variant selected initially. The trigger shows the "Select size" placeholder.
 */
export const NoSelection: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFVariantPicker>) => ({
    components: { SFVariantPicker },
    setup() {
      const activeVariant = ref<ProductVariant | undefined>(undefined)
      return { args, activeVariant }
    },
    template: `
      <div class="w-64">
        <SFVariantPicker
          class="w-full"
          v-bind="args"
          v-model:active-variant="activeVariant"
        />
      </div>
    `,
  }),
  args: {
    variants: defaultVariants,
  },
} satisfies Meta<typeof SFVariantPicker>

/**
 * Gift-selection styling (as used in the gift-promotion modal): every price is
 * struck through and each option shows the promotion reduction (e.g. `-50%`) in
 * sale red before the crossed-out original price.
 */
export const GiftSelection: Story = {
  args: {
    variants: defaultVariants,
    strikeThroughPrice: true,
    reductionLabel: '-50%',
  },
}
