import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { TextSize } from '@client/utils/constants'
import SFLabelValue from './SFLabelValue.vue'
import SFHint from './SFHint.vue'

/**
 * Specimen for the SCAYLE Storefront Typography. Renders every style in the
 * Figma source of truth grouped by sub-component (Heading, Body, Value,
 * Disclaimer / Helper / Caption, Hint) with a representative frontend
 * example for each row.
 *
 * Use this story when reviewing the design system, validating token coverage,
 * or auditing visual regressions across the typography family.
 */
export default {
  title: 'UI/Core/Typography',
} satisfies Meta

type Story = StoryObj

/**
 * Full Typography specimen with one frontend example per style.
 */
export const Overview = {
  render: () => ({
    components: {
      SFLabelValue,
      SFHint,
    },
    setup() {
      return { TextSize }
    },
    template: `
      <div class="flex max-w-2xl flex-col gap-12 p-6">
        <section class="flex flex-col gap-4">
          <h2 class="heading-section-1">Heading</h2>
          <h1 class="heading-page">Order confirmation</h1>
          <h2 class="heading-section-1">Shipping address</h2>
          <h3 class="heading-section-2">Payment method</h3>
          <h4 class="heading-section-3">Item details</h4>
        </section>

        <section class="flex flex-col gap-4">
          <h2 class="heading-section-1">Body</h2>
          <p class="body-large">
            Body large in text-primary. Used for lead paragraphs and intro copy.
          </p>
          <p class="body-large-secondary">
            Body large in text-secondary. Used for supporting paragraphs.
          </p>
          <p class="body-default">
            Body default in text-primary. The standard reading size for product
            descriptions, basket lines, and form copy.
          </p>
          <p class="body-default-secondary">
            Body default in text-secondary. The standard reading size for
            metadata and lower-emphasis copy.
          </p>
        </section>

        <section class="flex flex-col gap-4">
          <h2 class="heading-section-1">Value</h2>
          <SFLabelValue :size="TextSize.LARGE" label="Total:">€129.00</SFLabelValue>
          <SFLabelValue :size="TextSize.DEFAULT" label="Order ID:">#A1B2-C3D4</SFLabelValue>
        </section>

        <section class="flex flex-col gap-4">
          <h2 class="heading-section-1">Disclaimer / Helper / Caption</h2>
          <p class="disclaimer">
            Prices include VAT. Shipping calculated at checkout.
          </p>
          <span class="disclaimer">
            We never share your email address.
          </span>
          <p class="disclaimer">
            Model is 6'1" and wears size M.
          </p>
        </section>

        <section class="flex flex-col gap-4">
          <h2 class="heading-section-1">Hint</h2>
          <SFHint type="SUCCESS" title="Success!">
            Your changes have been saved.
          </SFHint>
          <SFHint>
            Items in your basket are reserved for the next 15 minutes.
          </SFHint>
        </section>
      </div>
    `,
  }),
} satisfies Story
