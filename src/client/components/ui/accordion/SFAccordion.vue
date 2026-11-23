<template>
  <div
    class="group/entry transition-colors"
    :class="[
      SIZE_CLASSES[size].entry,
      {
        'hover:bg-gray-100 has-[details[open]]:hover:bg-transparent': !disabled,
      },
    ]"
  >
    <!--
      In the two-column layout, `<summary>` is grid item 1; the
      `::details-content` UA pseudo (which wraps all non-summary children) is
      grid item 2 with its default `display: block`. The inner `<div>` is a
      regular block child of the pseudo, not a direct grid item.
    -->
    <details
      :id="id"
      class="group accordion-transition"
      :class="{ 'sm:grid sm:grid-cols-2 sm:items-start': !forceOneColumn }"
      :aria-disabled="disabled || undefined"
    >
      <!--
        Spanning both grid columns while closed lets the empty right half of
        the row toggle the accordion too.
      -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- `summary` is natively focusable and Enter or Space dispatch its click. -->
      <summary
        class="list-none [&::-webkit-details-marker]:hidden"
        :class="[
          SIZE_CLASSES[size].summary,
          {
            'sm:group-not-open:col-span-2': !forceOneColumn,
            'pointer-events-none cursor-not-allowed': disabled,
            'cursor-pointer': !disabled,
          },
        ]"
        :tabindex="disabled ? -1 : undefined"
        data-testid="accordion-summary"
        @click="handleSummaryClick"
      >
        <!--
          Inside the grid the summary is the left column, so from `sm` up the
          icon moves next to the title instead of sitting at the far right of
          the row. Without a grid the row spans the full width at every size,
          so the title and the icon stay at opposite ends.
        -->
        <div
          class="flex w-full items-center gap-3"
          :class="[
            SIZE_CLASSES[size].titleRow,
            {
              'max-sm:justify-between sm:h-min sm:flex-row-reverse sm:justify-end':
                !forceOneColumn,
              'justify-between': forceOneColumn,
            },
          ]"
        >
          <div class="wrap-break-word" :class="SIZE_CLASSES[size].title">
            <slot name="title">
              {{ title }}
            </slot>
          </div>
          <IconIncrementPlus
            class="size-4 shrink-0 group-open:hidden"
            :class="{
              'fill-gray-500': disabled,
              'fill-primary': !disabled,
            }"
          />
          <IconIncrementMinus
            class="hidden size-4 shrink-0 group-open:block"
            :class="{
              'fill-gray-500': disabled,
              'fill-primary': !disabled,
            }"
          />
        </div>
      </summary>
      <div
        :class="[SIZE_CLASSES[size].content, { 'lg:pt-0': !forceOneColumn }]"
      >
        <slot />
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import IconIncrementMinus from '@assets/icons/increment/minus.svg'
import IconIncrementPlus from '@assets/icons/increment/plus.svg'
import { Size } from '@client/utils/constants'

type AccordionSize = typeof Size.MD | typeof Size.LG

const {
  disabled = false,
  forceOneColumn = false,
  size = Size.LG,
} = defineProps<{
  /** The title text displayed in the accordion header. */
  title?: string
  /** Unique identifier applied to the `<details>` element. */
  id: string
  /**
   * When true, the accordion is non-interactive and rendered in the disabled
   * token set (muted text and icon colors, removed from the tab chain, click
   * and keyboard activation suppressed).
   */
  disabled?: boolean
  /**
   * When true, the content stays stacked below the title at every viewport
   * size. Set it in narrow surfaces, such as the product detail page's info
   * column, where the accordion already occupies half the row and splitting it
   * again would leave the content too cramped to read.
   *
   * By default the accordion switches to two columns from the `sm` breakpoint
   * upward, with the title in the left column and the expanded content in the
   * right one.
   */
  forceOneColumn?: boolean
  /**
   * Controls the row height and the type size of the title and content.
   *
   * `lg` (default) gives each row generous vertical padding and a section-sized
   * title, for accordions that are the main content of a page, such as CMS
   * FAQ blocks. `md` keeps each row at a 64px title row with body-sized
   * content, for accordions that sit next to other page content, such as the
   * product details on the product detail page.
   */
  size?: AccordionSize
}>()

/**
 * While closed, the summary pulls itself over the entry's padding and puts the
 * same padding back, so the whole row the hover background covers toggles the
 * accordion while the layout stays put. Once open, the summary shrinks back to
 * the title row so it doesn't cover the content. The `summary` values mirror
 * the `entry` padding of the same size; change them together.
 *
 * `md` has no vertical entry padding, so its title row carries the row height
 * on its own and the summary only bleeds sideways.
 */
const SIZE_CLASSES = {
  [Size.MD]: {
    entry: 'px-2 sm:px-2.5',
    summary:
      'group-not-open:-mx-2 group-not-open:px-2 sm:group-not-open:-mx-2.5 sm:group-not-open:px-2.5',
    titleRow: 'min-h-16',
    title: 'text-lg font-semibold',
    content: 'pb-5 text-md',
  },
  [Size.LG]: {
    entry: 'px-2 py-5 sm:px-2.5 sm:py-10',
    summary:
      'group-not-open:-mx-2 group-not-open:-my-5 group-not-open:px-2 group-not-open:py-5 sm:group-not-open:-mx-2.5 sm:group-not-open:-my-10 sm:group-not-open:px-2.5 sm:group-not-open:py-10',
    titleRow: 'min-h-12',
    title: 'text-2xl font-semibold',
    content: 'py-4 text-lg',
  },
} as const satisfies Record<
  AccordionSize,
  Record<'entry' | 'summary' | 'titleRow' | 'title' | 'content', string>
>

const handleSummaryClick = (event: Event) => {
  if (disabled) {
    event.preventDefault()
  }
}
</script>
