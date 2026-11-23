<!-- eslint-disable vuejs-accessibility/mouse-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Hover opens the flyout for pointer users. Keyboard users open it with the submenu button that appears on focus, and `focusout` and `keydown` close it. -->
<template>
  <li
    ref="root"
    class="flex h-full items-center pl-4 first:pl-0"
    @mouseenter="openFlyout"
    @mouseleave="onMouseLeave"
    @focusout="onFocusOut"
    @keydown="onKeyDown"
  >
    <div class="relative flex items-center">
      <SFNavigationTreeItem
        :navigation-item="navigationItem"
        class="mr-0! flex h-6! items-center py-1"
        :class="{
          'text-primary': !navigationItem?.linkColor,
        }"
        data-testid="nav-link-main"
        :is-active="isActive"
      >
        <span class="text-lg/10 font-semibold">
          {{ navigationItem.name }}
        </span>
      </SFNavigationTreeItem>
      <SFButton
        v-if="navigationItem.children.length"
        :ref="setTrigger"
        class="pointer-events-none absolute -right-4 z-10 opacity-0 focus-visible:opacity-100"
        :aria-expanded="isOpen"
        :aria-label="
          $t('navigation.a11y.show_submenu', { name: navigationItem.name })
        "
        :aria-controls="flyoutId"
        variant="raw"
        @click="openFlyout"
      >
        <IconNavigationDown class="size-4" />
      </SFButton>
    </div>
    <SFDesktopNavigationFlyout
      v-if="navigationItem.children.length"
      v-show="isOpen"
      :id="flyoutId"
      :item="navigationItem"
      class="absolute inset-x-0 top-[63px] z-20 m-0!"
      @close="closeFlyout"
    />
  </li>
</template>
<!-- eslint-enable vuejs-accessibility/mouse-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconNavigationDown from '@assets/icons/navigation/down.svg'
import type { NavigationItem } from '@scayle/storefront/types'
import { useRoute } from '@client/composables/useRoute'
import { useReturnFocus } from '@client/composables/useReturnFocus'
import SFNavigationTreeItem from '../SFNavigationTreeItem.vue'
import SFDesktopNavigationFlyout from './SFDesktopNavigationFlyout.vue'

const { navigationItem } = defineProps<{ navigationItem: NavigationItem }>()

const isOpen = ref(false)
const root = useTemplateRef<HTMLLIElement>('root')
const { setTrigger, returnFocus } = useReturnFocus()
const flyoutId = `nav-flyout-${useId().replace(/:/g, '')}-${navigationItem.id}`

const { path } = useRoute()

const isActive = computed(() => {
  if (!navigationItem.href.startsWith('/c')) {
    return false
  }

  return navigationItem.href === path.value
})

const openFlyout = () => {
  isOpen.value = true
}

const closeFlyout = () => {
  isOpen.value = false
}

// Move focus to the trigger button when focus is in the flyout
// while mouse leave is fire to prevent focus getting yanked to <body>
const onMouseLeave = () => {
  if (root.value?.contains(document.activeElement)) {
    // Synchronous focus (no defer) so hiding the flyout below can't yank focus
    // to `<body>` first.
    returnFocus()
  }
  closeFlyout()
}

const onFocusOut = (event: FocusEvent) => {
  const rootEl = root.value
  if (rootEl && !rootEl.contains(event.relatedTarget as Node | null)) {
    closeFlyout()
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    returnFocus()
    closeFlyout()
  }
}
</script>
