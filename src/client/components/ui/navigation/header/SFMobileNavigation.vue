<template>
  <nav
    class="relative mb-5 flex min-h-0 grow flex-col overflow-hidden scroll-shadow"
    :aria-label="$t('navigation.a11y.mobile_categories')"
  >
    <div
      class="relative min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto"
    >
      <Transition
        :enter-from-class="panelTransition.enterFrom"
        :enter-to-class="panelTransition.enterTo"
        :leave-from-class="panelTransition.leaveFrom"
        :leave-to-class="panelTransition.leaveTo"
        enter-active-class="transition-all transition-discrete duration-200 ease-in-out"
        leave-active-class="transition-all transition-discrete duration-200 ease-in-out absolute inset-0"
      >
        <ul
          v-if="!selectedItem"
          key="main"
          class="mt-2 flex w-full shrink-0 flex-col gap-y-5 p-0"
        >
          <li
            v-for="item in navigationItems"
            :key="item.id"
            data-testid="mobile-nav-link-main"
          >
            <template v-if="item.children.length === 0">
              <div class="flex w-full cursor-pointer content-center pr-4">
                <SFLink
                  class="grow rounded-sm focus-visible:focus-style-inset"
                  raw
                  :to="item.href"
                  :target="item.openInNewWindow ? '_blank' : '_self'"
                  prefetch-on-press
                  @click="$emit('clickLink')"
                >
                  <SFNavigationTreeItem
                    :navigation-item="item"
                    class="min-h-11 content-center rounded-sm text-2xl! font-semibold transition-all hover:bg-(--backgroundColor)"
                    disabled-link
                  />
                </SFLink>
              </div>
            </template>
            <template v-else>
              <div
                class="flex w-full content-center items-center justify-between pr-4"
              >
                <SFLink
                  class="grow rounded-sm focus-visible:focus-style-inset"
                  raw
                  :to="item.href"
                  :target="item.openInNewWindow ? '_blank' : '_self'"
                  prefetch-on-press
                  @click="$emit('clickLink')"
                >
                  <SFNavigationTreeItem
                    :navigation-item="item"
                    class="min-h-11 content-center rounded-sm text-2xl! font-semibold transition-all hover:bg-(--backgroundColor)"
                    disabled-link
                  />
                </SFLink>
                <SFButton
                  :id="subNavigationToggleId(item.id)"
                  variant="raw"
                  class="shrink-0 bg-transparent"
                  :aria-label="
                    $t('navigation.a11y.show_subcategories', {
                      name: item.name,
                    })
                  "
                  @click="openSubNavigation(item)"
                >
                  <span class="aspect-square rounded-md bg-gray-300 p-3">
                    <IconNavigationRight class="size-4! fill-secondary" />
                  </span>
                </SFButton>
              </div>
            </template>
          </li>
        </ul>
        <div
          v-else
          :key="`sub-${selectedItem.id}`"
          class="mt-2 w-full shrink-0 bg-transparent"
        >
          <SFButton
            ref="backButtonRef"
            variant="raw"
            class="mb-5 h-11"
            :aria-label="$t('navigation.a11y.back_to_main_menu')"
            size="lg"
            @click="closeSubNavigation(selectedItem)"
          >
            <IconNavigationLeft class="mr-2 size-4 text-primary" />
            <SFNavigationTreeItem
              class="text-2xl! font-semibold"
              :navigation-item="selectedItem"
              disabled-link
            />
          </SFButton>
          <div class="flex flex-col gap-y-5">
            <template v-for="item in selectedItem.children" :key="item.id">
              <div v-if="item.children.length">
                <!-- eslint-disable-next-line vuejs-accessibility/heading-has-content -- The `SFNavigationTreeItem` inside the button renders the item title. -->
                <h3 class="m-0">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between py-0"
                    :aria-expanded="isSubgroupExpanded(item.id)"
                    :aria-controls="subgroupPanelId(item.id)"
                    data-testid="mobile-nav-accordion"
                    @click="toggleSubgroup(item.id)"
                  >
                    <SFNavigationTreeItem
                      class="h-11 content-center py-0 text-xl! font-semibold"
                      disabled-link
                      :navigation-item="item"
                    />
                    <span class="ml-auto flex shrink-0">
                      <IconIncrementPlus
                        v-if="!isSubgroupExpanded(item.id)"
                        class="size-4"
                      />
                      <IconIncrementMinus v-else class="size-4" />
                    </span>
                  </button>
                </h3>
                <ul
                  v-show="isSubgroupExpanded(item.id)"
                  :id="subgroupPanelId(item.id)"
                  class="mt-2 flex flex-col gap-2 pl-2"
                >
                  <li
                    v-for="child in item.children"
                    :key="child.id"
                    class="flex items-center"
                    data-testid="mobile-navigation-item"
                  >
                    <SFNavigationTreeItem
                      :navigation-item="child"
                      class="h-11 w-full text-lg"
                      @click="$emit('clickLink')"
                    />
                  </li>
                </ul>
              </div>
              <SFNavigationTreeItem
                v-else
                :navigation-item="item"
                class="min-h-11 text-xl! font-semibold"
                @click="$emit('clickLink')"
              />
            </template>
          </div>
        </div>
      </Transition>
    </div>
  </nav>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import IconNavigationRight from '@assets/icons/navigation/right.svg'
import IconIncrementPlus from '@assets/icons/increment/plus.svg'
import IconIncrementMinus from '@assets/icons/increment/minus.svg'
import type { NavigationItem } from '@scayle/storefront/types'
import SFNavigationTreeItem from '../SFNavigationTreeItem.vue'

const { isOpen, navigationItems } = defineProps<{
  /**
   * Whether the mobile navigation is currently open and visible.
   */
  isOpen: boolean
  /**
   * Array of navigation tree items with nested children for hierarchical mobile navigation.
   */
  navigationItems?: NavigationItem[]
}>()

defineEmits<{
  clickLink: []
}>()

const selectedItem = ref<NavigationItem | undefined>(undefined)
const expandedSubgroups = ref<Set<NavigationItem['id']>>(new Set())

const TRANSITION_IN = {
  enterFrom: 'translate-x-full',
  enterTo: 'translate-x-0',
  leaveFrom: 'translate-x-0',
  leaveTo: '-translate-x-full',
}
const TRANSITION_OUT = {
  enterFrom: '-translate-x-full',
  enterTo: 'translate-x-0',
  leaveFrom: 'translate-x-0',
  leaveTo: 'translate-x-full',
}

const panelTransition = computed(() =>
  selectedItem.value ? TRANSITION_IN : TRANSITION_OUT,
)

const idPrefix = `mobile-nav-${useId().replace(/:/g, '')}`
const subgroupPanelId = (itemId: NavigationItem['id']) =>
  `${idPrefix}-subgroup-${itemId}`
const subNavigationToggleId = (itemId: NavigationItem['id']) =>
  `${idPrefix}-toggle-${itemId}`

const backButtonRef = useTemplateRef<ComponentPublicInstance>('backButtonRef')

const isSubgroupExpanded = (itemId: NavigationItem['id']) =>
  expandedSubgroups.value.has(itemId)

const toggleSubgroup = (itemId: NavigationItem['id']) => {
  const next = new Set(expandedSubgroups.value)
  if (next.has(itemId)) {
    next.delete(itemId)
  } else {
    next.add(itemId)
  }
  expandedSubgroups.value = next
}

const openSubNavigation = async (item: NavigationItem) => {
  if (item.children.length === 0) {
    return
  }
  selectedItem.value = item
  expandedSubgroups.value = new Set()
  await nextTick()
  const backEl = backButtonRef.value?.$el as HTMLElement | undefined
  backEl?.focus({ preventScroll: true })
}

const closeSubNavigation = async (item: NavigationItem) => {
  selectedItem.value = undefined
  await nextTick()
  // The main list unmounts while a sub-panel is open, so the toggle that
  // opened it is a new element by now and has to be looked up again.
  // Unlike the back button, it is focused without `preventScroll`: a short
  // sub-panel resets the list's scroll position, which can leave the toggle
  // out of view. The list slides in from the left, so the scroll stays
  // vertical.
  document.getElementById(subNavigationToggleId(item.id))?.focus()
}

watch(
  () => isOpen,
  () => {
    setTimeout(() => {
      selectedItem.value = undefined
      expandedSubgroups.value = new Set()
    }, 200)
  },
)
</script>
