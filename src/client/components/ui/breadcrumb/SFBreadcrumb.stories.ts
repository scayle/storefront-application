import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFBreadcrumb from './SFBreadcrumb.vue'

/**
 * SFBreadcrumb renders an accessible breadcrumb trail backed by `<nav>` and
 * `<ol>` semantics. Styling is responsive — small on mobile, large from the
 * `lg` breakpoint up. Supports a "last item as current" variant that marks
 * the final entry with `aria-current="page"`, and ellipsis truncation when
 * the trail exceeds `maxItems`.
 */
const meta = {
  title: 'UI/Breadcrumb/SFBreadcrumb',
  component: SFBreadcrumb,
  argTypes: {
    lastAsCurrent: { control: 'boolean' },
    maxItems: { control: 'number' },
  },
} satisfies Meta<typeof SFBreadcrumb>

export default meta
type Story = StoryObj<typeof SFBreadcrumb>

const shortItems = [
  { value: 'Page 1', to: '/page-1' },
  { value: 'Page 2', to: '/page-2' },
  { value: 'Page 3', to: '/page-3' },
]

const shortItemsWithMeta = [
  { value: 'Page 1', to: '/page-1' },
  { value: 'Page 2', to: '/page-2' },
  { value: 'Page 3', meta: '169 items' },
]

const longItems = [
  { value: 'Page 1', to: '/page-1' },
  { value: 'Page 2', to: '/page-2' },
  { value: 'Page 3', to: '/page-3' },
  { value: 'Page 4', to: '/page-4' },
  { value: 'Page 5', to: '/page-5' },
]

/** Every item interactive. Used on PDP and wider surfaces. */
export const Default = {
  args: { items: shortItems },
} satisfies Story

/** Final entry rendered as the current page with a meta count (PLP pattern). */
export const LastAsCurrent = {
  args: { items: shortItemsWithMeta, lastAsCurrent: true },
} satisfies Story

/** Current pill without a meta count (e.g. content pages). */
export const LastAsCurrentNoMeta = {
  args: { items: shortItems, lastAsCurrent: true },
} satisfies Story

/** Trail collapsed with an ellipsis once it exceeds `maxItems` (default 4). */
export const Truncated = {
  args: { items: longItems, maxItems: 4 },
} satisfies Story

/** Truncated trail with the current-page variant. */
export const TruncatedLastAsCurrent = {
  args: { items: longItems, maxItems: 4, lastAsCurrent: true },
} satisfies Story
