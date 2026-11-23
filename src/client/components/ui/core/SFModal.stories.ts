import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import { ButtonVariant, ModalSize } from '@client/utils/constants'
import SFButton from './SFButton.vue'
import SFModal from './SFModal.vue'

/**
 * SFModal implements the Storefront Design System dialog from Figma: overlay,
 * sized desktop panels, mobile full-width layout, optional description and
 * content slot, and an `actions` row (full-width controls below `lg`, inline from `lg`).
 *
 * Use structured props plus the `actions` slot for confirmations. Use the default
 * slot for custom layouts (image zoom, promotion picker) and pass `label` or
 * `labelledBy`.
 */
const meta = {
  title: 'UI/Core/SFModal',
  component: SFModal,
  args: {
    visible: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Controls visibility. Bind with `v-model:visible`.',
    },
    headline: {
      control: 'text',
      description: 'Structured layout title. Omit for custom-slot modals.',
    },
    description: {
      control: 'text',
      description: 'Supporting copy below the headline. Hidden when omitted.',
    },
    size: {
      control: { type: 'select' },
      options: Object.values(ModalSize),
    },
    closeOnBackdropClick: {
      control: 'boolean',
    },
    onClose: { action: 'close' },
    onCancel: { action: 'cancel' },
  },
} satisfies Meta<typeof SFModal>

export default meta
type Story = StoryObj<typeof SFModal>

const openButtonClass =
  'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white'

/** Structured modal with a headline and primary action only (Single variant). */
export const SingleActionDesktopSmall = {
  args: {
    headline: 'Are you sure you want to remove this item?',
    description: 'Are you sure you want to remove this item from your basket?',
    size: ModalSize.SM,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return { args, isVisible, openButtonClass }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open modal
        </button>
        <SFModal
          v-bind="args"
          v-model:visible="isVisible"
          @close="isVisible = false"
        >
          <template #actions>
            <SFButton
              data-testid="modal-primary-action"
              @click="isVisible = false"
            >
              Remove item
            </SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

export const SingleActionDesktopMedium = {
  args: {
    headline: 'Confirm changes',
    description: 'Your updates will be applied to this basket item.',
    size: ModalSize.MD,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return { args, isVisible, openButtonClass }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open modal
        </button>
        <SFModal
          v-bind="args"
          v-model:visible="isVisible"
          @close="isVisible = false"
        >
          <template #actions>
            <SFButton
              data-testid="modal-primary-action"
              @click="isVisible = false"
            >
              Confirm
            </SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

export const SingleActionDesktopLarge = {
  args: {
    headline: 'Save preferences',
    description: 'Your notification settings will be stored for this shop.',
    size: ModalSize.LG,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return { args, isVisible, openButtonClass }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open modal
        </button>
        <SFModal
          v-bind="args"
          v-model:visible="isVisible"
          @close="isVisible = false"
        >
          <template #actions>
            <SFButton
              data-testid="modal-primary-action"
              @click="isVisible = false"
            >
              Save
            </SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

/** Multi variant: two stacked buttons on mobile, horizontal row on desktop. */
export const MultiActionDesktop = {
  args: {
    headline: 'Choose an action',
    description: 'You can continue with action 1, action 2, or cancel.',
    size: ModalSize.MD,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return { args, isVisible, openButtonClass, ButtonVariant }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open modal
        </button>
        <SFModal
          v-bind="args"
          v-model:visible="isVisible"
          @close="isVisible = false"
        >
          <template #actions>
            <SFButton
              data-testid="modal-primary-action"
              @click="isVisible = false"
            >
              Action 1
            </SFButton>
            <SFButton
              data-testid="modal-secondary-action"
              @click="isVisible = false"
            >
              Action 2
            </SFButton>
            <SFButton
              data-testid="modal-secondary-action"
              @click="isVisible = false"
            >
              Action 3            
            </SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

/**
 * Basket remove confirmation: headline, description, primary action, and fixed
 * cancel control. Matches `SFBasketDeleteConfirmationModal` usage on the basket page.
 */
export const BasketRemoveConfirmation = {
  args: {
    headline: 'Are you sure you want to remove this item?',
    description: 'Are you sure you want to remove this item from your basket?',
    size: ModalSize.SM,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return { args, isVisible, openButtonClass }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open basket remove modal
        </button>
        <SFModal
          v-bind="args"
          v-model:visible="isVisible"
          @close="isVisible = false"
        >
          <template #actions>
            <SFButton
              data-testid="basket-remove-item-confirm-button"
              @click="isVisible = false"
            >
              Remove item
            </SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

/** Headline and actions without a description paragraph. */
export const WithoutDescription = {
  args: {
    headline: 'Confirm',
    size: ModalSize.MD,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return { args, isVisible, openButtonClass }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open modal
        </button>
        <SFModal
          v-bind="args"
          v-model:visible="isVisible"
          @close="isVisible = false"
        >
          <template #actions>
            <SFButton
              data-testid="modal-primary-action"
              @click="isVisible = false"
            >
              Confirm
            </SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

/** Optional content slot between description and the action row. */
export const WithContentSlot = {
  args: {
    headline: 'Update quantity',
    description: 'Choose how many items you want in your basket.',
    size: ModalSize.MD,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return {
        args,
        isVisible,
        openButtonClass,
        ButtonVariant,
      }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open modal
        </button>
        <SFModal
          v-bind="args"
          v-model:visible="isVisible"
          @close="isVisible = false"
        >
          <div
            class="body-default-secondary rounded-xl border border-dashed border-gray-400 bg-gray-100 p-6 text-center"
          >
            Content (optional)
          </div>
          <template #actions>
            <SFButton @click="isVisible = false">Update</SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

/**
 * Multiple primary actions in the actions slot (parent-controlled layout).
 */
export const MultiplePrimaryActions = {
  args: {
    headline: 'Export data',
    description: 'Choose which format to download.',
    size: ModalSize.MD,
  },
  render: (args: ComponentPropsAndSlots<typeof SFModal>) => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      return { args, isVisible, openButtonClass, ButtonVariant }
    },
    template: `
      <div class="flex min-h-[28rem] min-w-full items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open modal
        </button>
        <SFModal v-bind="args" v-model:visible="isVisible" @close="isVisible = false">
          <template #actions>
            <SFButton @click="isVisible = false">CSV</SFButton>
            <SFButton @click="isVisible = false">JSON</SFButton>
            <SFButton :variant="ButtonVariant.SECONDARY" @click="isVisible = false">
              PDF
            </SFButton>
          </template>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story

/**
 * Custom default slot: no `headline`, `description`, or `#actions`. Parent places
 * markup in the slot (here: actions first, then copy) and supplies `label` or
 * `labelledBy` for the accessible name.
 */
export const CustomSlot = {
  render: () => ({
    components: { SFModal, SFButton },
    setup() {
      const isVisible = ref(false)
      const titleId = 'custom-modal-title'
      return { isVisible, titleId, openButtonClass, ButtonVariant }
    },
    template: `
      <div class="flex min-h-[28rem] items-center justify-center bg-gray-100 p-8">
        <button type="button" :class="openButtonClass" @click="isVisible = true">
          Open custom modal
        </button>
        <SFModal
          v-model:visible="isVisible"
          :labelled-by="titleId"
          size="sm"
          @close="isVisible = false"
        >
          <div
            class="flex flex-col items-center gap-6 px-6 py-10 text-center lg:px-8 lg:py-12"
          >
            <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <SFButton @click="isVisible = false">Save changes</SFButton>
              <SFButton
                :variant="ButtonVariant.SECONDARY"
                @click="isVisible = false"
              >
                Not now
              </SFButton>
            </div>
            <h2 :id="titleId" class="heading-section-2">Custom layout</h2>
            <p class="body-default-secondary">
              Structured modals use <code>headline</code>, an optional description,
              content, and the <code>#actions</code> slot with a fixed cancel control.
              The default slot leaves order, spacing, and buttons entirely to you.
            </p>
          </div>
        </SFModal>
      </div>
    `,
  }),
} satisfies Story
