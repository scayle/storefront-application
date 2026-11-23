<template>
  <header class="max-lg:mt-3 lg:relative" data-testid="header">
    <!-- No breakpoint token covers widths below 320px, so max-[20rem] tightens the spacing of this row and of the icon group below. -->
    <div
      class="container flex h-13 items-center space-x-4 max-[20rem]:space-x-2 lg:h-16 lg:space-x-7"
    >
      <SFButton
        ref="sidebarMenuToggle"
        variant="raw"
        class="flex h-8 w-6 shrink-0 items-center justify-center text-primary! aria-busy:animate-pulse aria-busy:cursor-progress motion-reduce:aria-busy:opacity-50 lg:hidden"
        data-testid="side-navigation-button"
        :aria-label="sidebarToggleLabel"
        v-bind="sidebarTriggerAttrs"
        @click="toggleSidebar"
      >
        <IconNavigationClose v-if="isSidebarOpen" class="size-5" />
        <IconNavigationMenu v-else class="size-6" />
      </SFButton>

      <SFLogoLink
        data-testid="header-logo"
        class="lg:ml-0!"
        @click="closeSidebar()"
      />

      <!-- The nav takes the width of its links and the search field fills what is left. Once the search field is down to its minimum width, the nav shrinks and the links that no longer fit wrap onto a second row that is clipped, so the header never grows wider than the page. -->
      <nav
        class="h-full min-w-0 flex-initial max-lg:hidden"
        :aria-label="$t('navigation.a11y.main')"
        data-testid="nav-categories"
      >
        <ul class="flex size-full flex-wrap overflow-y-clip">
          <SFHeaderNavigationItem
            v-for="item in navigationItems"
            :key="item.id"
            :navigation-item="item"
          />
        </ul>
      </nav>
      <SFSearchField
        class="ml-auto min-w-40 flex-1 max-lg:hidden"
        data-testid="search-desktop"
        input-id="header-search"
      />
      <div
        class="flex shrink-0 items-center gap-3 max-lg:grow max-lg:justify-end max-[20rem]:gap-2"
      >
        <SFShopSwitcher placement="header" class="max-lg:hidden" />
        <SFAccountLink />
        <SFPromotionModalButton :promotion-count="promotionCount" />
        <SFWishlistLink />
        <SFBasketLink />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconNavigationMenu from '@assets/icons/navigation/menu.svg'
import IconNavigationClose from '@assets/icons/navigation/close.svg'
import type { NavigationItem } from '@scayle/storefront/types'
import { computed } from 'vue'
import { useMobileSidebar } from '@client/composables/useMobileSidebar'
import { useI18n } from 'vue-i18n'
import SFPromotionModalButton from '@client/components/deal/modal/SFPromotionModalButton.vue'
import SFShopSwitcher from '@client/components/shopSwitcher/SFShopSwitcher.vue'
import SFLogoLink from '../SFLogoLink.vue'
import SFSearchField from '../../form/SFSearchField.vue'
import SFHeaderNavigationItem from './SFHeaderNavigationItem.vue'
import SFAccountLink from './links/SFAccountLink.vue'
import SFBasketLink from './links/basket/SFBasketLink.vue'
import SFWishlistLink from './links/SFWishlistLink.vue'

defineProps<{
  /** Main navigation, shown in the desktop navigation bar. */
  navigationItems: NavigationItem[]
  /** Number of active promotions, shown as a badge on the promotion button. */
  promotionCount: number
}>()

const {
  isOpen: isSidebarOpen,
  toggle: toggleSidebar,
  close: closeSidebar,
  triggerAttrs: sidebarTriggerAttrs,
  menuToggle: sidebarMenuToggle,
} = useMobileSidebar()

const { t } = useI18n()
const sidebarToggleLabel = computed(() =>
  isSidebarOpen.value
    ? t('navigation.a11y.close_side_navigation')
    : t('navigation.a11y.side_navigation'),
)
</script>
