import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'

import { createMockBasketItem } from '../../../test/mock-data/basket'
import { createMockProductVariant } from '../../../test/mock-data/products'

import SFBasketVariantSelector from './SFBasketVariantSelector.vue'

const size39 = createMockProductVariant({ id: 2, label: '39' })
const soldOutSize = createMockProductVariant({
  id: 3,
  label: '40',
  stock: 0,
  isSoldOut: true,
})
const sizes = [
  createMockProductVariant({ id: 1, label: '38' }),
  size39,
  soldOutSize,
  createMockProductVariant({ id: 4, label: '41' }),
]
const oneSize = createMockProductVariant({ label: 'One size' })

/**
 * The editable `Size:` row on a basket card. Reuses the product detail page's
 * variant picker, so the open list — per-size prices, disabled sold-out rows —
 * looks the same in both places, while the trigger is compact enough to sit in
 * the card's attribute list.
 *
 * The panel is an anchored dropdown from `lg` up and a bottom sheet below it;
 * use the Storybook viewport tool to see both.
 *
 * Selecting a size has no visible effect here: the component only reports the
 * pick, and the basket page performs the change.
 */
export default {
  title: 'Basket/SFBasketVariantSelector',
  component: SFBasketVariantSelector,
  parameters: { layout: 'centered' },
  // Constrained to roughly the width the attribute row has on a basket card,
  // so the trigger and panel are seen at their real proportions.
  render: (args: ComponentPropsAndSlots<typeof SFBasketVariantSelector>) => ({
    components: { SFBasketVariantSelector },
    setup() {
      return { args }
    },
    template:
      '<div class="max-w-sm"><SFBasketVariantSelector v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SFBasketVariantSelector>

type Story = StoryObj<typeof SFBasketVariantSelector>

/** Line holding size 39, with one sold-out size in the list. */
export const Default: Story = {
  args: {
    item: createMockBasketItem({ variant: size39, variants: sizes }),
  },
}

/**
 * The line's own size has sold out. The selector stays enabled so the customer
 * can switch to a size in stock and return the item to the active basket.
 */
export const SoldOutLine: Story = {
  args: {
    item: createMockBasketItem({ variant: soldOutSize, variants: sizes }),
  },
}

/**
 * The size row of a basket card at a viewport width of 320px, which leaves the
 * label and the picker 128px. The wrapper is a flex row like the one in
 * `SFBasketCardDetails`, so the selector's own `min-w-0` is what lets it shrink.
 * The picker shrinks to the space left, so it stays inside the card.
 */
export const NarrowCard: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFBasketVariantSelector>) => ({
    components: { SFBasketVariantSelector },
    setup() {
      return { args }
    },
    template:
      '<div class="flex w-32 space-x-1"><SFBasketVariantSelector v-bind="args" /></div>',
  }),
  args: {
    item: createMockBasketItem({ variant: size39, variants: sizes }),
  },
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}

/**
 * A sold-out size in the same 128px row. The text does not fit, so it ends in an
 * ellipsis inside the picker.
 */
export const NarrowCardSoldOut: Story = {
  ...NarrowCard,
  args: {
    item: createMockBasketItem({ variant: soldOutSize, variants: sizes }),
  },
}

/**
 * The change the selector reported is still running. The picker is blocked so a
 * second size cannot be picked against a line the basket is about to replace.
 */
export const Loading: Story = {
  args: {
    item: createMockBasketItem({ variant: size39, variants: sizes }),
    loading: true,
  },
}

/**
 * Single-size product. The picker disables its trigger, matching the product
 * detail page.
 */
export const SingleSize: Story = {
  args: {
    item: createMockBasketItem({ variant: oneSize }),
  },
}
