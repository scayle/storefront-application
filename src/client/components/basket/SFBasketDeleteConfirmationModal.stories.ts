import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { ref } from 'vue'

import SFBasketDeleteConfirmationModal from './SFBasketDeleteConfirmationModal.vue'

const openButtonClass =
  'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white'

/**
 * Confirmation dialog shown when a shopper removes a basket line item.
 *
 * Wraps `SFModal` with basket i18n copy (`basket_card.remove_from_basket_confirmation`
 * as the headline, `basket_card.remove_from_basket_confirmation_description` as
 * supporting text) and a single primary action. Cancel and the close control
 * emit `cancel`. The parent owns `v-model:visible` and handles removal on `confirm`.
 */
const meta = {
  title: 'Basket/SFBasketDeleteConfirmationModal',
  component: SFBasketDeleteConfirmationModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    visible: false,
    isConfirming: false,
    onConfirm: fn(),
    onCancel: fn(),
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Controls visibility. Bind with `v-model:visible`.',
    },
    isConfirming: {
      control: 'boolean',
      description:
        'Disables and shows loading on the remove button while the API call runs.',
    },
    onConfirm: { action: 'confirm' },
    onCancel: { action: 'cancel' },
  },
} satisfies Meta<typeof SFBasketDeleteConfirmationModal>

export default meta
type Story = StoryObj<typeof SFBasketDeleteConfirmationModal>

const renderWithOpenButton = (
  args: ComponentPropsAndSlots<typeof SFBasketDeleteConfirmationModal>,
) => ({
  components: { SFBasketDeleteConfirmationModal },
  setup() {
    const isVisible = ref(args.visible ?? false)
    return { args, isVisible, openButtonClass }
  },
  template: `
    <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
      <button type="button" :class="openButtonClass" @click="isVisible = true">
        Remove basket item
      </button>
      <SFBasketDeleteConfirmationModal
        v-bind="args"
        v-model:visible="isVisible"
        @confirm="args.onConfirm"
        @cancel="isVisible = false; args.onCancel()"
      />
    </div>
  `,
})

/** Default open state with translated headline, description, and action labels. */
export const Default = {
  render: renderWithOpenButton,
} satisfies Story

/** Primary action shows a loading state while the remove request is in flight. */
export const Confirming = {
  args: {
    isConfirming: true,
  },
  render: (
    args: ComponentPropsAndSlots<typeof SFBasketDeleteConfirmationModal>,
  ) => ({
    components: { SFBasketDeleteConfirmationModal },
    setup() {
      const isVisible = ref(true)
      return { args, isVisible, openButtonClass }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <SFBasketDeleteConfirmationModal
          v-bind="args"
          v-model:visible="isVisible"
          @confirm="args.onConfirm"
          @cancel="isVisible = false; args.onCancel()"
        />
      </div>
    `,
  }),
} satisfies Story

/**
 * Mobile layout: full-width panel below the top inset. Use the Storybook viewport
 * tool to compare against desktop.
 */
export const Mobile = {
  render: renderWithOpenButton,
  parameters: {
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '390px', height: '820px' } },
      },
    },
    initialGlobals: {
      viewport: { value: 'mobile' },
    },
  },
} satisfies Story
