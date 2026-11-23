<template>
  <header id="header" class="border-b border-gray-200">
    <div
      class="relative container flex h-15 w-full items-center justify-between heading-section-3"
    >
      <!-- Matches the nav links' hover box from md on fine pointers, where they show and hover applies.
           Below md and on touch tablets the 40px tap target stays.
           The max width keeps a long label clear of the centered logo. -->
      <SFBackButton
        :to="routes.home"
        class="max-w-5/12 md:pointer-fine:h-auto md:pointer-fine:py-1"
        data-testid="back-to-shop-button"
      >
        <span class="hidden md:inline">{{ $t('common.back_to_shop') }}</span>
        <span class="md:hidden">{{ $t('common.to_shop') }}</span>
      </SFBackButton>

      <SFLink
        :to="routes.home"
        raw
        class="absolute left-1/2 -translate-x-1/2"
        :aria-label="shopName || $t('navigation.a11y.home_link')"
      >
        <IconLogoSignet class="size-7" />
      </SFLink>

      <!-- The logo is absolutely centered, so links never push it aside. At 768px they get about
           350px beside it, which fits four short links; more or longer CMS links run under the logo. -->
      <nav
        class="hidden flex-row gap-4 md:flex"
        :aria-label="$t('navigation.a11y.header')"
      >
        <SFNavigationTreeItem
          v-for="navItem in navigationItems"
          :key="`header-link-${navItem.id}`"
          raw
          class="rounded-md p-1 hover:bg-gray-200"
          :navigation-item="navItem"
        />
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFBackButton from '@client/components/ui/navigation/SFBackButton.vue'
import IconLogoSignet from '@assets/icons/logo/signet.svg'
import type { NavigationItem } from '@scayle/storefront/types'
import { routes } from '@shared/routes'
import SFNavigationTreeItem from '../SFNavigationTreeItem.vue'

defineProps<{
  /**
   * Shop display name used as the logo link accessible label. Missing when the
   * shop configuration could not be read, which falls back to the generic home
   * link label.
   */
  shopName?: string
  /** Header navigation items shown in the simple checkout layout */
  navigationItems: NavigationItem[]
}>()
</script>
