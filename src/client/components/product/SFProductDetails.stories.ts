import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import type { ProductDetailSection } from '@shared/types/Product'
import { createMockDetailedProduct } from '../../../test/mock-data/products'
import SFProductDetails from './SFProductDetails.vue'

const productDescription =
  'A versatile jacket for everyday wear. Made from durable materials with a focus on comfort and style.'

const detailsDefault: ProductDetailSection[] = [
  {
    key: 'design',
    label: 'Design',
    intro: productDescription,
    content: ['Regular fit', 'Lightweight fabric', 'Classic style'],
  },
  {
    key: 'extras',
    label: 'Extra',
    content: ['Hood', 'Pockets', 'Adjustable cuffs'],
  },
  {
    key: 'fit_size',
    label: 'Fit & Size',
    content: ['S', 'M', 'L', 'XL'],
  },
]

const productDefault = createMockDetailedProduct({
  details: detailsDefault,
  description: productDescription,
})

const detailsMultiple: ProductDetailSection[] = [
  ...detailsDefault,
  {
    key: 'material',
    label: 'Material',
    content: ['100% Cotton', 'Inner lining: Polyester'],
  },
  {
    key: 'care',
    label: 'Care',
    content: ['Machine wash 30°C', 'Do not tumble dry', 'Iron on low heat'],
  },
]

const productMultipleAttributes = createMockDetailedProduct({
  details: detailsMultiple,
  description: productDescription,
})

/**
 * SFProductDetails renders accordion sections from the product's filtered attributes
 * (e.g. Design, Extras, Fit & Size) and a fixed shipping and returns section.
 * The "design" attribute can show the product description above its value list.
 */
export default {
  title: 'Product/SFProductDetails',
  component: SFProductDetails,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductDetails>) => ({
    components: { SFProductDetails },
    setup() {
      return { args }
    },
    template: `
      <div class="w-full max-w-160">
        <SFProductDetails v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    product: { control: false },
  },
} satisfies Meta<typeof SFProductDetails>

type Story = StoryObj<typeof SFProductDetails>

/**
 * Product with filtered attributes and description; design block shows description and list.
 */
export const Default: Story = {
  args: {
    product: productDefault,
  },
}

/**
 * More attribute sections to show several accordion entries.
 */
export const MultipleAttributes: Story = {
  args: {
    product: productMultipleAttributes,
  },
}
