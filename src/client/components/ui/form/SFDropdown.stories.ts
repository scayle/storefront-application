import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref, shallowRef } from 'vue'
import {
  DropdownOptionType,
  DropdownSize,
  DropdownVariant,
} from '@client/utils/constants'
import SFDropdown from './SFDropdown.vue'
import SFDropdownOptionItem from './SFDropdownOptionItem.vue'
import SFDropdownOptionGroup from './SFDropdownOptionGroup.vue'

// Storybook's `Meta` rejects a generic component as `component`
// (https://github.com/storybookjs/storybook/issues/24238), so that field is typed separately.
// Arg value types are still checked, but an unknown arg name is not.
type SFDropdownMeta = Omit<Meta<typeof SFDropdown>, 'component'> & {
  component: typeof SFDropdown
}

/**
 * SFDropdown is the V3 design-system dropdown / select primitive.
 *
 * - Two trigger variants: `with-label` (floating label) and `without-label` (placeholder-only).
 * - Three sizes (sm / md / lg) per the Figma S/M/L axis.
 * - Full state matrix: enabled (empty + filled), hover, focus, open, error, disabled.
 * - Items are rendered through the default `#item` slot, but the component ships with
 *   `SFDropdownOptionItem` + `SFDropdownOptionGroup` helpers that mirror Figma's
 *   option-item and group sub-components.
 */
const meta = {
  title: 'UI/Form/SFDropdown',
  component: SFDropdown,
  parameters: { layout: 'centered' },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: Object.values(DropdownSize),
    },
    variant: {
      control: { type: 'select' },
      options: Object.values(DropdownVariant),
    },
  },
  args: {
    id: 'dropdown-story',
    items: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
    placeholder: 'Choose option',
    // The placeholder is not an accessible name for a `div` combobox.
    ariaLabel: 'Choose option',
    helperMessage: 'Helper message goes here',
  },
  render: (args) => ({
    components: { SFDropdown },
    setup() {
      const selectedItem = ref<string | undefined>()
      return { args, selectedItem }
    },
    template: `
      <div class="w-[420px] max-w-full">
        <SFDropdown v-model="selectedItem" v-bind="args" />
      </div>
    `,
  }),
} satisfies SFDropdownMeta

export default meta

type Story = StoryObj<typeof SFDropdown>

/** Enabled, empty trigger. Placeholder visible, helper message below. */
export const EnabledEmpty: Story = {
  args: { variant: DropdownVariant.WITHOUT_LABEL },
}

/** Enabled, value selected. */
export const EnabledFilled: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: { SFDropdown },
    setup() {
      const selectedItem = ref<string | undefined>('Selected option')
      return { args, selectedItem }
    },
    template: `
      <div class="w-[420px] max-w-full">
        <SFDropdown v-model="selectedItem" v-bind="args" />
      </div>
    `,
  }),
  args: { variant: DropdownVariant.WITHOUT_LABEL },
}

/** Error state — `border-status-alert` and alert-colored helper text. */
export const ErrorState: Story = {
  args: {
    variant: DropdownVariant.WITHOUT_LABEL,
    hasErrors: true,
    errorMessage: 'Error message goes here',
  },
}

/** Disabled state — non-interactive, muted styling. */
export const Disabled: Story = {
  args: { variant: DropdownVariant.WITHOUT_LABEL, disabled: true },
}

/**
 * A selected value wider than the dropdown ends in an ellipsis instead of
 * pushing the trigger past its container.
 */
export const LongValueTruncates: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: { SFDropdown },
    setup() {
      const selectedItem = ref<string | undefined>(
        'A selected value that is much wider than the dropdown',
      )
      return { args, selectedItem }
    },
    template: `
      <div class="w-[160px]">
        <SFDropdown v-model="selectedItem" v-bind="args" />
      </div>
    `,
  }),
  args: { variant: DropdownVariant.WITHOUT_LABEL },
}

/** With-label variant — floating label that lifts above when filled or focused. */
export const WithLabel: Story = {
  args: { variant: DropdownVariant.WITH_LABEL, label: 'Choose option' },
}

/** With-label variant in the filled state — label floats above the value. */
export const WithLabelFilled: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: { SFDropdown },
    setup() {
      const selectedItem = ref<string | undefined>('Selected option')
      return { args, selectedItem }
    },
    template: `
      <div class="w-[420px] max-w-full">
        <SFDropdown v-model="selectedItem" v-bind="args" />
      </div>
    `,
  }),
  args: { variant: DropdownVariant.WITH_LABEL, label: 'Choose option' },
}

/** Open panel using the default `SFDropdownOptionItem` renderer. */
export const Open: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: { SFDropdown },
    setup() {
      const selectedItem = ref<string | undefined>('Option 2')
      const visible = ref(true)
      return { args, selectedItem, visible }
    },
    template: `
      <div class="w-[420px] max-w-full pb-72">
        <SFDropdown
          v-model="selectedItem"
          v-model:visible="visible"
          v-bind="args"
        />
      </div>
    `,
  }),
  args: { variant: DropdownVariant.WITHOUT_LABEL },
}

/** Open panel with leading-radio option items — the size-select pattern from Figma. */
export const WithLeadingRadio: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: {
      SFDropdown,
      SFDropdownOptionItem,
      SFDropdownOptionGroup,
    },
    setup() {
      const sizes = ['XS', 'S', 'M', 'L', 'XL']
      const selectedItem = ref<string | undefined>('M')
      const visible = ref(false)
      return {
        args: { ...args, items: sizes },
        selectedItem,
        visible,
        DropdownOptionType,
      }
    },
    template: `
      <div class="w-[420px] max-w-full pb-96">
        <SFDropdown
          v-model="selectedItem"
          v-model:visible="visible"
          v-bind="args"
        >
          <template #item="{ item, selectItem, setActive, index, isSelected, isActive, id }">
            <SFDropdownOptionItem
              :id="id"
              :type="DropdownOptionType.LEADING_RADIO"
              :selected="isSelected"
              :active="isActive"
              @select="selectItem(item)"
              @mousemove="setActive(index)"
            >
              {{ item }}
            </SFDropdownOptionItem>
          </template>
        </SFDropdown>
      </div>
    `,
  }),
  args: {
    variant: DropdownVariant.WITH_LABEL,
    label: 'Size',
    placeholder: 'Choose size',
  },
}

/** Custom item slot — preserves the slot escape hatch for arbitrary item content. */
export const CustomItem: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: { SFDropdown, SFDropdownOptionItem },
    setup() {
      interface Plan {
        name: string
        price: string
      }
      const items: Plan[] = [
        { name: 'Basic Plan', price: '€ 9.00' },
        { name: 'Pro Plan', price: '€ 19.00' },
        { name: 'Enterprise', price: '€ 49.00' },
      ]
      const selectedItem = ref<Plan | undefined>(items[0])
      return {
        args: { ...args, items },
        selectedItem,
      }
    },
    template: `
      <div class="w-[420px] max-w-full">
        <SFDropdown v-model="selectedItem" v-bind="args">
          <template #default>
            <span class="text-md text-primary">{{ selectedItem?.name }}</span>
          </template>
          <template #item="{ item, selectItem, setActive, index, isSelected, isActive, id }">
            <SFDropdownOptionItem
              :id="id"
              :selected="isSelected"
              :active="isActive"
              @select="selectItem(item)"
              @mousemove="setActive(index)"
            >
              {{ item.name }}
              <template #trailing>
                <span class="text-sm">{{ item.price }}</span>
              </template>
            </SFDropdownOptionItem>
          </template>
        </SFDropdown>
      </div>
    `,
  }),
  args: { variant: DropdownVariant.WITHOUT_LABEL, placeholder: 'Choose plan' },
}

/**
 * Individually disabled options via the `isOptionDisabled` predicate. Disabled items
 * stay visible and are announced as disabled, but keyboard navigation skips
 * over them and Enter / Space ignores activation. Mirrors the sold-out variant
 * pattern in `SFVariantPicker`. Starts with a sold-out size (`S`) selected: the
 * list opens with nothing highlighted until an arrow key is pressed.
 */
export const WithDisabledOptions: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: { SFDropdown, SFDropdownOptionItem },
    setup() {
      interface Size {
        label: string
        inStock: boolean
      }
      const items: Size[] = [
        { label: 'XS', inStock: true },
        { label: 'S', inStock: false },
        { label: 'M', inStock: true },
        { label: 'L', inStock: false },
        { label: 'XL', inStock: true },
      ]
      // `shallowRef` keeps the item identical to the one in `items`, which the
      // dropdown compares by reference.
      const selectedItem = shallowRef<Size | undefined>(items[1])
      const visible = ref(false)
      const isOptionDisabled = (item: Size) => !item.inStock
      return {
        args: { ...args, items, isOptionDisabled },
        selectedItem,
        visible,
      }
    },
    template: `
      <div class="w-[420px] max-w-full pb-72">
        <SFDropdown
          v-model="selectedItem"
          v-model:visible="visible"
          v-bind="args"
        >
          <template #default>
            <span class="text-md text-primary">{{ selectedItem?.label }}</span>
          </template>
          <template #item="{ item, selectItem, setActive, index, isSelected, isActive, isDisabled, id }">
            <SFDropdownOptionItem
              :id="id"
              :selected="isSelected"
              :active="isActive"
              :disabled="isDisabled"
              @select="selectItem(item)"
              @mousemove="setActive(index)"
            >
              <span :class="{ 'line-through': isDisabled }">{{ item.label }}</span>
              <template #trailing>
                <span v-if="isDisabled" class="text-secondary text-sm">Sold out</span>
              </template>
            </SFDropdownOptionItem>
          </template>
        </SFDropdown>
      </div>
    `,
  }),
  args: {
    variant: DropdownVariant.WITH_LABEL,
    label: 'Size',
    placeholder: 'Choose size',
  },
}

/**
 * Grouped options using the `groupBy` prop with `SFDropdownOptionGroup`
 * headers. Items are pre-sorted so members of a group are adjacent in
 * `items`; the dropdown renders a header per consecutive run.
 */
export const WithGroupedOptions: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFDropdown>) => ({
    components: { SFDropdown, SFDropdownOptionItem },
    setup() {
      interface Country {
        name: string
        continent: string
      }
      const items: Country[] = [
        { name: 'Germany', continent: 'Europe' },
        { name: 'France', continent: 'Europe' },
        { name: 'Italy', continent: 'Europe' },
        { name: 'United States', continent: 'Americas' },
        { name: 'Canada', continent: 'Americas' },
        { name: 'Japan', continent: 'Asia' },
        { name: 'South Korea', continent: 'Asia' },
      ]
      const selectedItem = ref<Country | undefined>(items[0])
      const visible = ref(false)
      const groupBy = (item: Country) => item.continent
      return { args: { ...args, items, groupBy }, selectedItem, visible }
    },
    template: `
      <div class="w-[420px] max-w-full pb-96">
        <SFDropdown
          v-model="selectedItem"
          v-model:visible="visible"
          v-bind="args"
        >
          <template #default>
            <span class="text-md text-primary">{{ selectedItem?.name }}</span>
          </template>
          <template #item="{ item, selectItem, setActive, index, isSelected, isActive, id }">
            <SFDropdownOptionItem
              :id="id"
              :selected="isSelected"
              :active="isActive"
              @select="selectItem(item)"
              @mousemove="setActive(index)"
            >
              {{ item.name }}
            </SFDropdownOptionItem>
          </template>
        </SFDropdown>
      </div>
    `,
  }),
  args: {
    variant: DropdownVariant.WITH_LABEL,
    label: 'Country',
    placeholder: 'Choose country',
  },
}

/**
 * Full matrix — sizes × states for both trigger variants. Mirrors the Figma reference page
 * so visual review can be done one-to-one.
 */
export const Matrix: Story = {
  render: () => ({
    components: { SFDropdown },
    setup() {
      const items = ['Option 1', 'Option 2', 'Option 3']
      return {
        items,
        sizes: Object.values(DropdownSize),
        variants: Object.values(DropdownVariant),
        states: [
          {
            key: 'enabled-empty',
            label: 'Enabled / Empty',
            value: undefined,
            props: {},
          },
          {
            key: 'enabled-filled',
            label: 'Enabled / Filled',
            value: 'Selected option',
            props: {},
          },
          {
            key: 'error',
            label: 'Error',
            value: undefined,
            props: { hasErrors: true, errorMessage: 'Error message' },
          },
          {
            key: 'disabled',
            label: 'Disabled',
            value: undefined,
            props: { disabled: true },
          },
        ],
      }
    },
    template: `
      <div class="flex flex-col gap-12">
        <section v-for="variant in variants" :key="variant" class="flex flex-col gap-4">
          <h3 class="text-lg font-semibold capitalize">Variant: {{ variant }}</h3>
          <div
            class="grid gap-6"
            :style="'grid-template-columns: 160px repeat(' + sizes.length + ', 1fr);'"
          >
            <div></div>
            <div v-for="size in sizes" :key="size" class="text-sm text-secondary capitalize">
              {{ size }}
            </div>
            <template v-for="state in states" :key="state.key">
              <div class="text-sm text-secondary self-center">{{ state.label }}</div>
              <div v-for="size in sizes" :key="size + state.key">
                <SFDropdown
                  :id="'matrix-' + variant + '-' + size + '-' + state.key"
                  :items="items"
                  :size="size"
                  :variant="variant"
                  :label="variant === 'with-label' ? 'Choose option' : undefined"
                  placeholder="Choose option"
                  aria-label="Choose option"
                  helper-message="Helper message"
                  :model-value="state.value"
                  v-bind="state.props"
                />
              </div>
            </template>
          </div>
        </section>
      </div>
    `,
  }),
}
