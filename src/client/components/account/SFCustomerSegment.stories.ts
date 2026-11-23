import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, watch } from 'vue'
import { expect, mocked } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import { storybookCustomer } from '../../../../.storybook/rpc-mock'
import SFCustomerSegment from './SFCustomerSegment.vue'

interface SFCustomerSegmentStoryArgs {
  /** Puts the signed-in customer in the `vip` customer segment. */
  inVipSegment: boolean
  /** Puts the signed-in customer in the `fifty-plus` customer segment. */
  inFiftyPlusSegment: boolean
  /** Passed to the component's `renderAllMatching` prop. */
  renderAllMatching: boolean
}

const vipSegment = { id: 'segment-vip', name: 'VIP', referenceKey: 'vip' }
const fiftyPlusSegment = {
  id: 'segment-fifty-plus',
  name: '50+',
  referenceKey: 'fifty-plus',
}

const VIP_TEXT = 'VIP customers get free express shipping.'
const FIFTY_PLUS_TEXT = 'Our 50+ collection is new this season.'
const DEFAULT_TEXT = 'Free shipping on orders over 50 €.'

/**
 * SFCustomerSegment renders different content for customers in different customer
 * segments. It renders no element of its own, only its slots.
 * Toggle **inVipSegment** and **inFiftyPlusSegment** in Controls to change the
 * segments of the signed-in customer, and **renderAllMatching** to render every
 * matching slot instead of the first.
 *
 * Key features:
 * - Each named slot is the reference key of a customer segment, and renders when the
 *   logged-in customer belongs to that segment
 * - The required default slot renders for a user who is not logged in, for a customer in
 *   none of the named segments, and while the deferred `customer` prop resolves
 * - For a customer in several of the named segments, the first slot declared wins,
 *   unless `renderAllMatching` is set. A slot with `v-if`, `v-else-if`, `v-else`, or
 *   `v-for` comes after the slots without one
 */
export default {
  title: 'Account/SFCustomerSegment',
  component: SFCustomerSegment,
  argTypes: {
    inVipSegment: { control: 'boolean' },
    inFiftyPlusSegment: { control: 'boolean' },
    renderAllMatching: { control: 'boolean' },
  },
  args: {
    inVipSegment: false,
    inFiftyPlusSegment: false,
    renderAllMatching: false,
  },
  // A reactive page lets the render function swap the customer when a
  // control changes, without remounting the story.
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue(
      reactive({
        ...page,
        props: { ...page.props },
      }),
    )
  },
  render: (args) => ({
    components: { SFCustomerSegment },
    setup() {
      const page = usePage()
      watch(
        () => [args.inVipSegment, args.inFiftyPlusSegment],
        ([inVipSegment, inFiftyPlusSegment]) => {
          page.props.customer = {
            ...storybookCustomer,
            segments: [
              ...(inVipSegment ? [vipSegment] : []),
              ...(inFiftyPlusSegment ? [fiftyPlusSegment] : []),
            ],
          }
        },
        { immediate: true },
      )
      return { args, VIP_TEXT, FIFTY_PLUS_TEXT, DEFAULT_TEXT }
    },
    template: `
      <SFCustomerSegment :render-all-matching="args.renderAllMatching">
        <template #vip>
          <p class="body-default">{{ VIP_TEXT }}</p>
        </template>
        <template #fifty-plus>
          <p class="body-default">{{ FIFTY_PLUS_TEXT }}</p>
        </template>
        <p class="body-default">{{ DEFAULT_TEXT }}</p>
      </SFCustomerSegment>
    `,
  }),
} satisfies Meta<SFCustomerSegmentStoryArgs>

type Story = StoryObj<SFCustomerSegmentStoryArgs>

/** Signed-in customer in none of the named segments: the default slot renders. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(DEFAULT_TEXT)).toBeVisible()
  },
}

/** Customer in the `vip` segment: the `vip` slot renders instead of the default. */
export const InVipSegment: Story = {
  args: { inVipSegment: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(VIP_TEXT)).toBeVisible()
    await expect(canvas.queryByText(DEFAULT_TEXT)).toBeNull()
  },
}

/** Customer in both segments: only the first declared slot, `vip`, renders. */
export const InSeveralSegments: Story = {
  args: { inVipSegment: true, inFiftyPlusSegment: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(VIP_TEXT)).toBeVisible()
    await expect(canvas.queryByText(FIFTY_PLUS_TEXT)).toBeNull()
  },
}

/** Customer in both segments with `renderAllMatching`: both slots render, in declaration order. */
export const RenderAllMatching: Story = {
  args: {
    inVipSegment: true,
    inFiftyPlusSegment: true,
    renderAllMatching: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(VIP_TEXT)).toBeVisible()
    await expect(canvas.getByText(FIFTY_PLUS_TEXT)).toBeVisible()
    await expect(canvas.queryByText(DEFAULT_TEXT)).toBeNull()
  },
}
