import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
  Decorator,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import { createMockDetailedProduct } from '../../../../test/mock-data/products'
import SFSiblingSelection from './SFSiblingSelection.vue'

type SiblingSelectionArgs = ComponentPropsAndSlots<typeof SFSiblingSelection>

const withWrapperWidth =
  (widthClass: string): Decorator<SiblingSelectionArgs> =>
  () => ({
    template: `<div class="w-full ${widthClass}"><story /></div>`,
  })

/**
 * SFSiblingSelection shows color siblings on the PDP: a labelled row of large
 * thumbnails with horizontal scroll. The loaded variant is prepended to
 * `product.siblings` and marked with `aria-current="page"`. Desktop shows
 * prev/next controls when the row overflows (`max-lg:hidden` hides them on
 * smaller viewports).
 */
export default {
  title: 'Product/Detail/SFSiblingSelection',
  component: SFSiblingSelection,
  parameters: {
    layout: 'centered',
  },
  render: (args: SiblingSelectionArgs) => {
    const selectedId = ref(args.product.id)
    const onCaptureClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href]')
      if (!anchor) {
        return
      }
      const href = anchor.getAttribute('href')
      if (!href) {
        return
      }
      e.preventDefault()
      const variant = args.product.siblings.find(
        (sibling) => sibling.link === href,
      )
      if (variant) {
        selectedId.value = variant.id
      }
    }
    return {
      components: { SFSiblingSelection },
      setup() {
        return {
          args,
          onCaptureClick,
        }
      },
      template: `
        <div @click.capture="onCaptureClick">
          <SFSiblingSelection v-bind="args" />
        </div>
      `,
    }
  },
} satisfies Meta<typeof SFSiblingSelection>

type Story = StoryObj<typeof SFSiblingSelection>

const productWithSiblings = createMockDetailedProduct()

/**
 * Default desktop-width layout with multiple in-stock siblings and one sold-out swatch.
 */
export const Default = {
  args: {
    product: productWithSiblings,
  },
  decorators: [withWrapperWidth('max-w-128')],
} satisfies Story

/**
 * Mobile viewport: chevron controls are hidden via `max-lg:hidden` and the row scrolls natively.
 */
export const Mobile = {
  name: 'Mobile',
  args: {
    product: productWithSiblings,
  },
  decorators: [withWrapperWidth('max-w-xs')],
  globals: {
    viewport: { value: 'mobile2', isRotated: false },
  },
} satisfies Story

/**
 * All siblings sold out: every swatch uses the disabled thumbnail state.
 */
export const AllSoldOut = {
  name: 'All sold out',
  args: {
    product: createMockDetailedProduct({
      isSoldOut: true,
      siblings: productWithSiblings.siblings.map((sibling) => ({
        ...sibling,
        isSoldOut: true,
      })),
    }),
  },
  decorators: [withWrapperWidth('max-w-128')],
} satisfies Story

/**
 * Trimmed sibling assets: every swatch takes the compact padding step, matching the
 * padded product card swatch. The loaded variant is included, so the whole row is
 * padded rather than only the siblings.
 */
export const PaddedSiblingImages = {
  name: 'Padded sibling images',
  args: {
    product: createMockDetailedProduct({
      images: productWithSiblings.images.map((image) => ({
        ...image,
        applyPadding: true,
      })),
      siblings: productWithSiblings.siblings.map((sibling) => ({
        ...sibling,
        image: sibling.image && { ...sibling.image, applyPadding: true },
      })),
    }),
  },
  decorators: [withWrapperWidth('max-w-128')],
} satisfies Story

/**
 * First sibling in the row (after the loaded variant) is sold out.
 */
export const FirstSiblingSoldOut = {
  name: 'First sibling sold out',
  args: {
    product: createMockDetailedProduct({
      isSoldOut: false,
      siblings: [
        {
          ...productWithSiblings.siblings[0]!,
          isSoldOut: true,
        },
        ...productWithSiblings.siblings.slice(1),
      ],
    }),
  },
  decorators: [withWrapperWidth('max-w-128')],
} satisfies Story
