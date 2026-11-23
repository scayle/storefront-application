<template>
  <footer class="border-t border-gray-200 bg-white" data-testid="footer">
    <div class="container flex flex-col gap-5 py-5 lg:gap-8 lg:py-7">
      <SFLogoLink data-testid="footer-logo" />
      <nav
        class="grid grid-cols-1 gap-y-5 text-md lg:grid-cols-4"
        :aria-label="$t('footer.a11y.primary_nav')"
      >
        <SFFooterLinkSection
          v-for="section in navigationItems"
          :key="section.id"
          :section="section"
        />
      </nav>
    </div>
    <SFBottomFooter :navigation-items="bottomNavigationItems" />
  </footer>
</template>

<script setup lang="ts">
import type { NavigationItem } from '@scayle/storefront/types'
import SFLogoLink from '../SFLogoLink.vue'
import SFFooterLinkSection from './SFFooterLinkSection.vue'
import SFBottomFooter from './SFBottomFooter.vue'

defineProps<{
  /** Link sections. Each item becomes a headed column that lists its children as links. */
  navigationItems: NavigationItem[]
  /** Legal links in the bottom bar, next to the copyright notice. */
  bottomNavigationItems: NavigationItem[]
}>()
</script>
