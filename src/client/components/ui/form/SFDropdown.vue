<template>
  <div
    ref="dropdownContainer"
    class="relative inline-block w-full min-w-0 text-left"
  >
    <div ref="comboboxContainer" class="relative">
      <div
        :id="triggerId"
        ref="trigger"
        role="combobox"
        tabindex="0"
        :aria-controls="listboxId"
        :aria-expanded="isDropdownListVisible"
        :aria-invalid="hasErrors || undefined"
        :aria-disabled="disabled || undefined"
        :aria-label="ariaLabel"
        :aria-labelledby="hasWithLabel ? labelId : undefined"
        :aria-describedby="describedBy"
        :aria-activedescendant="activeOptionId"
        :class="triggerClass"
        :data-state="triggerStateAttr"
        @click="toggle"
        @focusin="isFocused = true"
        @focusout="isFocused = false"
        @keydown="onComboboxKeydown"
      >
        <span
          :class="[
            'flex min-w-0 flex-1 items-center gap-2 text-left',
            triggerBodyTextClass,
          ]"
        >
          <slot name="leading-icon" />
          <span class="min-w-0 flex-1 truncate">
            <slot>
              <template v-if="!isPlaceholderVisible">
                {{ modelValue }}
              </template>
              <template v-else-if="!hasWithLabel">
                {{ placeholder }}
              </template>
            </slot>
          </span>
        </span>
        <span class="ml-2 flex shrink-0 items-center" aria-hidden="true">
          <IconChevronDown
            class="size-3 transition-transform duration-200"
            :class="[isDropdownListVisible && 'rotate-180', chevronColorClass]"
          />
        </span>
      </div>
      <!--
        `for` cannot name a `div` combobox, so the trigger and the listbox take
        their name from here through `aria-labelledby`. `for` still ties the
        label to its control, which is how axe exempts the label of a disabled
        dropdown from the contrast check.
      -->
      <label
        v-if="hasWithLabel && label"
        :id="labelId"
        :for="triggerId"
        :class="labelClass"
      >
        <slot name="label">{{ label }}</slot>
      </label>
    </div>

    <Transition
      enter-from-class="translate-y-full lg:translate-y-0 lg:-translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full lg:translate-y-0 lg:-translate-y-1 opacity-0"
    >
      <div
        v-show="isDropdownListVisible"
        ref="options"
        v-popover="isDropdownListVisible"
        tabindex="-1"
        class="absolute m-0 w-full rounded-lg border border-gray-400 bg-white p-2 shadow-input max-lg:backdrop:bg-primary/50 max-lg:backdrop:transition-opacity max-lg:backdrop:duration-200 max-lg:backdrop:ease-linear max-lg:starting:backdrop:opacity-0"
        :class="{
          'block-scrolling': isMobile && isDropdownListVisible,
        }"
        :style="itemsContainerStyle"
        @mousedown.prevent
      >
        <!--
          Chrome and Firefox put a scroll container without focusable
          children in the tab order. Focus stays on the trigger, but the leave transition keeps
          this list displayed while Tab moves on, so without `tabindex="-1"`
          focus lands here and is lost once the panel hides.
        -->
        <ul
          :id="listboxId"
          role="listbox"
          tabindex="-1"
          :aria-label="ariaLabel"
          :aria-labelledby="hasWithLabel ? labelId : undefined"
          :aria-activedescendant="activeOptionId"
          class="scrollbar-hide flex max-h-[310px] flex-col gap-1 overflow-y-auto bg-white *:shrink-0"
          @mousedown.prevent
        >
          <template v-for="group in groupedItems" :key="group.key">
            <SFDropdownOptionGroup v-if="group.label" :label="group.label">
              <template v-for="entry in group.entries" :key="entry.index">
                <slot
                  v-if="$slots.item"
                  name="item"
                  v-bind="slotBindings(entry.item, entry.index)"
                />
                <SFDropdownOptionItem
                  v-else
                  :id="optionId(entry.index)"
                  :size="optionSize"
                  :selected="isSameItem(entry.item, modelValue)"
                  :active="entry.index === activeIndex"
                  @click="selectItem(entry.item)"
                  @mousemove="activeIndex = entry.index"
                >
                  {{ entry.item }}
                </SFDropdownOptionItem>
              </template>
            </SFDropdownOptionGroup>
            <template v-else>
              <template v-for="entry in group.entries" :key="entry.index">
                <slot
                  v-if="$slots.item"
                  name="item"
                  v-bind="slotBindings(entry.item, entry.index)"
                />
                <SFDropdownOptionItem
                  v-else
                  :id="optionId(entry.index)"
                  :size="optionSize"
                  :selected="isSameItem(entry.item, modelValue)"
                  :active="entry.index === activeIndex"
                  @click="selectItem(entry.item)"
                  @mousemove="activeIndex = entry.index"
                >
                  {{ entry.item }}
                </SFDropdownOptionItem>
              </template>
            </template>
          </template>
        </ul>
      </div>
    </Transition>

    <div
      v-if="helperText"
      :id="helperId"
      class="mt-2 text-sm"
      :class="hasErrors ? 'text-status-alert' : 'text-secondary'"
    >
      {{ helperText }}
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
/**
 * APG select-only combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
 *
 * - Trigger is `role="combobox"` (div, not button) and stays the DOM focus
 *   target across the entire open/close/select cycle.
 * - Active option is tracked via `aria-activedescendant` — no roving tabindex,
 *   no focus trap, no programmatic focus moves into the listbox.
 * - Options receive no `tabindex`. Click selects; keyboard activation is
 *   handled centrally on the combobox.
 * - Pass `isOptionDisabled` to skip un-selectable items in keyboard navigation
 *   (e.g. sold-out variants).
 */
import { computed, ref, useTemplateRef, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { vPopover } from '@client/directives/popover'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'
import { useDropdownPosition } from '@client/composables/useDropdownPosition'
import { wrapIndex } from '@client/utils/math'
import { useKeydownActions } from '@client/composables/useKeydownActions'
import {
  DropdownOptionSize,
  DropdownSize,
  DropdownVariant,
} from '@client/utils/constants'
import IconChevronDown from '@assets/icons/navigation/down.svg'
import SFDropdownOptionItem from './SFDropdownOptionItem.vue'
import SFDropdownOptionGroup from './SFDropdownOptionGroup.vue'

const {
  id,
  items,
  size = DropdownSize.MD,
  variant = DropdownVariant.WITHOUT_LABEL,
  label,
  placeholder = '',
  helperMessage,
  errorMessage,
  hasErrors = false,
  disabled = false,
  ariaLabel,
  ariaDescribedby,
  isOptionDisabled,
  groupBy,
  keyBy,
} = defineProps<{
  /** Unique identifier. Used to derive trigger / listbox / helper IDs. */
  id: string
  /** Items shown inside the open panel. Generic over `T`. */
  items: NonNullable<T>[]
  /** Trigger height + padding scale. Matches the Figma S/M/L axis. */
  size?: DropdownSize
  /** Trigger style. `with-label` renders a floating label, `without-label` shows the placeholder only. */
  variant?: DropdownVariant
  /** Floating label text. Required when `variant === 'with-label'`. */
  label?: string
  /** Placeholder text shown in the empty state of the trigger. */
  placeholder?: string
  /** Helper message rendered below the trigger when no error is set. */
  helperMessage?: string
  /** Error message that replaces the helper message in the Error state. */
  errorMessage?: string
  /** Visual error state. Sets `aria-invalid` and swaps to error styling. */
  hasErrors?: boolean
  /** Disables the trigger and prevents the panel from opening. */
  disabled?: boolean
  /**
   * Accessible name of the trigger and the option list. The `with-label`
   * variant names both with its visible label instead, so this is ignored there.
   */
  ariaLabel?: string
  /** ID of an external element describing the trigger. Combined with the helper/error ID. */
  ariaDescribedby?: string
  /**
   * Predicate marking individual items as un-selectable. Keyboard navigation
   * skips matches, Enter/Space ignores them. Use for cases like sold-out
   * variants where the combobox itself stays interactive — distinct from
   * `disabled`, which disables the whole trigger.
   */
  isOptionDisabled?: (item: NonNullable<T>) => boolean
  /**
   * Accessor that returns a group label per item. When set, consecutive items
   * sharing the same label are wrapped in an `SFDropdownOptionGroup` with that
   * header. Pre-sort items so members of a group are adjacent in `items`.
   */
  groupBy?: (item: NonNullable<T>) => string
  /**
   * Returns a stable key per item used for the selection comparison. Set this
   * when items are non-primitive objects: across an Inertia hydration roundtrip
   * the server and client receive structurally-equal but reference-unequal
   * objects, so the default `===` identity check fails on the client (the
   * selected item renders unselected, producing hydration mismatch warnings).
   * When unset, selection falls back to `===` (correct for primitive items).
   *
   * @example
   * ```vue
   * <SFDropdown :items="sortOptions" :key-by="(o) => o.key" />
   * ```
   */
  keyBy?: (item: NonNullable<T>) => string | number
}>()

/** Whether the options panel is open. Bind with `v-model:visible` to open or close it from outside. */
const isDropdownListVisible = defineModel<boolean>('visible', {
  default: false,
})

/** Selected item, bound with `v-model`. Matched against `items` through `keyBy` when set. */
const modelValue = defineModel<T>('modelValue')

const emit = defineEmits<{
  /** Fires when an option is chosen — via click, Enter, Space, or Tab. */
  select: [item: NonNullable<T>]
}>()

const isFocused = ref(false)
const activeIndex = ref<number | null>(null)
const triggerId = computed(() => `${id}-trigger`)
const listboxId = computed(() => `${id}-listbox`)
const labelId = computed(() => `${id}-label`)
const optionId = (index: number) => `${id}-option-${index}`

interface GroupEntry {
  item: NonNullable<T>
  index: number
}

interface OptionGroup {
  key: string
  label: string | undefined
  entries: GroupEntry[]
}

// Builds either a single ungrouped run or one run per `groupBy` label.
// Consecutive items sharing a label end up in the same group; the source order
// is preserved so `activeIndex` (into the flat `items` array) stays valid.
const groupedItems = computed<OptionGroup[]>(() => {
  if (!groupBy) {
    return [
      {
        key: 'flat',
        label: undefined,
        entries: items.map((item, index) => ({ item, index })),
      },
    ]
  }
  const groups: OptionGroup[] = []
  for (const [index, item] of items.entries()) {
    const label = groupBy(item)
    const last = groups.at(-1)
    if (last && last.label === label) {
      last.entries.push({ item, index })
    } else {
      groups.push({
        key: `${label}-${index}`,
        label,
        entries: [{ item, index }],
      })
    }
  }
  return groups
})

const activeOptionId = computed(() =>
  isDropdownListVisible.value && activeIndex.value !== null
    ? optionId(activeIndex.value)
    : undefined,
)

const isPlaceholderVisible = computed(
  () => modelValue.value === undefined || modelValue.value === null,
)

const hasWithLabel = computed(
  () => variant === DropdownVariant.WITH_LABEL && !!label,
)

const isLabelFloated = computed(
  () =>
    hasWithLabel.value &&
    (!isPlaceholderVisible.value ||
      isFocused.value ||
      isDropdownListVisible.value),
)

const triggerBodyTextClass = computed(() => {
  if (disabled) {
    return 'text-gray-500'
  }
  return 'text-secondary group-hover:text-primary'
})

const optionSize = computed(() =>
  size === DropdownSize.SM ? DropdownOptionSize.SM : DropdownOptionSize.LG,
)

const HEIGHT_CLASSES: Record<DropdownSize, string> = {
  [DropdownSize.SM]: 'h-8',
  [DropdownSize.MD]: 'h-10',
  [DropdownSize.LG]: 'h-12',
}

const heightClass = computed(() => HEIGHT_CLASSES[size])

const paddingClass = computed(() =>
  size === DropdownSize.SM ? 'px-4' : 'px-5',
)

const triggerStateAttr = computed(() => {
  if (disabled) {
    return 'disabled'
  }
  if (hasErrors) {
    return 'error'
  }
  if (isDropdownListVisible.value) {
    return 'open'
  }
  if (isFocused.value) {
    return 'focus'
  }
  if (!isPlaceholderVisible.value) {
    return 'filled'
  }
  return 'enabled'
})

const triggerClass = computed(() => {
  const base = [
    'group flex w-full items-center justify-between rounded-lg font-normal transition-colors duration-150',
    size === DropdownSize.LG ? 'text-lg' : 'text-md',
    'cursor-pointer',
    heightClass.value,
    paddingClass.value,
  ]

  if (disabled) {
    return [
      ...base,
      'cursor-not-allowed! border border-gray-300 bg-gray-100 text-gray-500',
    ]
  }

  if (hasErrors) {
    return [
      ...base,
      'border border-status-alert bg-white text-primary focus:ring-status-alert',
    ]
  }

  if (isDropdownListVisible.value) {
    return [...base, 'border border-transparent bg-gray-300 text-primary']
  }

  if (!isPlaceholderVisible.value) {
    return [
      ...base,
      'border border-gray-400 bg-white text-primary hover:bg-gray-200',
    ]
  }

  return [
    ...base,
    'border border-transparent bg-gray-200 text-secondary hover:bg-gray-300 hover:text-primary focus:bg-gray-200',
  ]
})

const chevronColorClass = computed(() => {
  if (disabled) {
    return 'fill-gray-400'
  }
  if (hasErrors || isDropdownListVisible.value) {
    return 'fill-primary'
  }
  return 'fill-secondary group-hover:fill-primary'
})

const labelClass = computed(() => {
  const base = [
    'pointer-events-none absolute transition-all duration-200 ease-out',
  ]

  if (isLabelFloated.value) {
    const isActive = isFocused.value || isDropdownListVisible.value
    let color = 'text-secondary'
    if (hasErrors) {
      color = 'text-status-alert'
    } else if (disabled) {
      color = 'text-gray-500'
    } else if (isActive) {
      color = 'text-accent'
    }

    let bg = 'bg-white'
    if (disabled) {
      bg = 'bg-gray-100'
    } else if (isPlaceholderVisible.value && !hasErrors) {
      bg = 'bg-gray-200'
    }

    return [
      ...base,
      color,
      bg,
      'left-4 top-0 -translate-y-1/2 px-1 text-sm font-normal rounded-sm',
    ]
  }

  return [
    ...base,
    'left-5 top-1/2 -translate-y-1/2 text-md font-normal',
    disabled ? 'text-gray-500' : 'text-secondary',
  ]
})

const helperText = computed(() =>
  hasErrors && errorMessage ? errorMessage : helperMessage,
)

const helperId = computed(() => (helperText.value ? `${id}-helper` : undefined))

const describedBy = computed(
  () =>
    [ariaDescribedby, helperId.value].filter(Boolean).join(' ') || undefined,
)

const isItemDisabled = (item: NonNullable<T>) =>
  isOptionDisabled ? isOptionDisabled(item) : false

// Selection equality. Uses `keyBy` when provided (stable across Inertia
// hydration, where structurally-equal items lose reference identity), and
// falls back to `===` for primitive items.
const isSameItem = (a: T | undefined, b: T | undefined): boolean => {
  if (a === b) {
    return true
  }
  if (keyBy && a !== undefined && a !== null && b !== undefined && b !== null) {
    return keyBy(a as NonNullable<T>) === keyBy(b as NonNullable<T>)
  }
  return false
}

const indexOfSelected = () => {
  if (modelValue.value === undefined || modelValue.value === null) {
    return -1
  }
  return items.findIndex((item) => isSameItem(item, modelValue.value))
}

const firstEnabledIndex = (from = 0, step = 1) => {
  for (let i = from; i >= 0 && i < items.length; i += step) {
    if (!isItemDisabled(items[i]!)) {
      return i
    }
  }
  return -1
}

const moveActive = (delta: 1 | -1) => {
  if (items.length === 0) {
    return
  }
  // Wrap-around: ArrowDown past the last option lands on the first, and vice
  // versa (APG canonical for a select-only combobox).
  // With nothing active (a disabled selection on open), ArrowDown starts above
  // the first option and ArrowUp wraps to the last one.
  const start = activeIndex.value ?? (delta === 1 ? -1 : 0)
  let next = wrapIndex(start + delta, items.length)
  // Skip over disabled items in the chosen direction. Stop after one full loop
  // so an all-disabled list doesn't spin forever.
  let safety = items.length
  while (isItemDisabled(items[next]!) && safety-- > 0) {
    next = wrapIndex(next + delta, items.length)
  }
  if (!isItemDisabled(items[next]!)) {
    activeIndex.value = next
  }
}

const open = () => {
  if (disabled) {
    return
  }
  const selected = indexOfSelected()
  if (selected < 0) {
    activeIndex.value = firstEnabledIndex(0, 1)
  } else {
    // A disabled selection (a sold-out size) can't be the active option. Leave
    // nothing highlighted instead of marking the first enabled row, which
    // reads as the selected one.
    activeIndex.value = isItemDisabled(items[selected]!) ? null : selected
  }
  isDropdownListVisible.value = true
}

const close = () => {
  isDropdownListVisible.value = false
  activeIndex.value = null
}

const toggle = () => {
  if (disabled) {
    return
  }
  if (isDropdownListVisible.value) {
    close()
  } else {
    open()
  }
}

const select = (item: NonNullable<T>) => {
  if (isItemDisabled(item)) {
    return
  }
  modelValue.value = item
  emit('select', item)
  close()
}

const setActive = (index: number) => {
  if (index >= 0 && index < items.length && !isItemDisabled(items[index]!)) {
    activeIndex.value = index
  }
}

const selectItem = (item: T) => {
  if (item === undefined || item === null) {
    return
  }
  select(item as NonNullable<T>)
}

const slotBindings = (item: NonNullable<T>, index: number) => ({
  item,
  selectItem,
  setActive,
  index,
  isSelected: isSameItem(item, modelValue.value),
  isActive: index === activeIndex.value,
  isDisabled: isItemDisabled(item),
  id: optionId(index),
  // The size the default rows render at. Slotted rows take it too, so a
  // compact trigger gets compact options rather than full-size ones that
  // overflow it.
  size: optionSize.value,
})

const selectActive = () => {
  if (activeIndex.value === null) {
    return
  }
  const item = items[activeIndex.value]
  if (item !== undefined) {
    select(item)
  }
}

type KeyAction = (event: KeyboardEvent) => void

const openFromClosed: KeyAction = (event) => {
  event.preventDefault()
  open()
}

// Keys handled while the listbox is closed. Anything else is left to the
// browser (Tab moves focus, etc.).
const closedActions: Record<string, KeyAction> = {
  down: openFromClosed,
  up: openFromClosed,
  enter: openFromClosed,
  space: openFromClosed,
  home: (event) => {
    event.preventDefault()
    open()
    activeIndex.value = firstEnabledIndex(0, 1)
  },
  end: (event) => {
    event.preventDefault()
    open()
    activeIndex.value = firstEnabledIndex(items.length - 1, -1)
  },
}

// Keys handled while the listbox is open. Tab is intentionally NOT
// preventDefault'd — we commit the active option and let Tab move focus.
const openActions: Record<string, KeyAction> = {
  down: (event) => {
    event.preventDefault()
    // Alt+ArrowDown is a no-op on an already-open listbox per APG.
    if (!event.altKey) {
      moveActive(1)
    }
  },
  up: (event) => {
    event.preventDefault()
    // Alt+ArrowUp commits the selection and closes (APG).
    if (event.altKey) {
      selectActive()
    } else {
      moveActive(-1)
    }
  },
  home: (event) => {
    event.preventDefault()
    activeIndex.value = firstEnabledIndex(0, 1)
  },
  end: (event) => {
    event.preventDefault()
    activeIndex.value = firstEnabledIndex(items.length - 1, -1)
  },
  enter: (event) => {
    event.preventDefault()
    selectActive()
  },
  space: (event) => {
    event.preventDefault()
    selectActive()
  },
  escape: (event) => {
    event.preventDefault()
    close()
  },
  // `selectActive` closes only when it commits, so Tab with nothing active
  // (a disabled selection, or every option disabled) would leave the list open
  // after focus has moved on.
  tab: () => {
    selectActive()
    close()
  },
}

// `preventDefault: false`: the actions prevent per-key, and `tab` (open state)
// deliberately does not — it commits the active option and lets Tab move focus.
const dispatchComboboxKeydown = useKeydownActions(
  () => (isDropdownListVisible.value ? openActions : closedActions),
  { preventDefault: false },
)

const onComboboxKeydown = (event: KeyboardEvent) => {
  if (disabled) {
    return
  }
  dispatchComboboxKeydown(event)
}

const { smaller } = useDefaultBreakpoints()
const isMobile = smaller('lg')

const comboboxRef = useTemplateRef('comboboxContainer')
const rootRef = useTemplateRef('dropdownContainer')
const triggerRef = useTemplateRef<HTMLElement>('trigger')

const optionsRef = useTemplateRef<HTMLElement>('options')

const itemsContainerStyle = useDropdownPosition({
  anchor: comboboxRef,
  panel: optionsRef,
  isOpen: isDropdownListVisible,
  isMobile,
  onResize: close,
})

// Lets consumers move focus to the combobox trigger programmatically (e.g.
// focus-to-first-invalid-field on form submit). The trigger is the canonical
// focus target across the entire APG select-only combobox lifecycle.
defineExpose({
  focus: () => triggerRef.value?.focus(),
})

onClickOutside(rootRef, () => {
  if (isDropdownListVisible.value) {
    close()
  }
})

// Keep the active descendant scrolled into view. `block: 'nearest'` is a no-op
// when the option is already visible, so mouse-driven `setActive` calls don't
// jolt the scroll position.
watch(
  activeIndex,
  (index) => {
    if (index === null || !isDropdownListVisible.value || import.meta.env.SSR) {
      return
    }
    document
      .getElementById(optionId(index))
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  },
  { flush: 'post' },
)
</script>
