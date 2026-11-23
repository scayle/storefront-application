<template>
  <!--
    `top-16` / `100dvh-64px` = header height (52px) + the 12px `mt-3` the
    header gains while the nav is open, so the sidebar sits flush below it.
  -->
  <SFSlideInTransition from="left" appear>
    <div
      :id="id"
      v-popover="{ open, source: toggleElement }"
      class="absolute top-16 m-0! flex h-[calc(100dvh-64px)] w-screen flex-col overscroll-contain bg-white p-0! lg:hidden"
      :class="{ 'translate-x-[-100vw]': !open }"
      :inert="!open"
      data-testid="mobile-sidebar"
    >
      <SFSearchField class="mt-1" data-testid="search-mobile" />
      <div class="flex grow flex-col p-5 pl-4">
        <SFMobileNavigation
          :is-open="open"
          :navigation-items="navigationItems"
          @click-link="$emit('close')"
        />
        <div class="mt-auto">
          <SFShopSwitcher placement="sidebar" />
          <SFButton
            v-if="customer"
            variant="raw"
            data-testid="logout-button"
            class="ml-px flex cursor-pointer items-center p-2 px-2 text-lg/5 font-normal text-secondary! lg:text-sm"
            @click="handleLogout"
          >
            <IconUserSignout class="mr-1 size-5!" />
            {{ $t('common.sign_out') }}
          </SFButton>
        </div>
      </div>
    </div>
  </SFSlideInTransition>
</template>

<script setup lang="ts">
/**
 * Mobile navigation panel below the header, with search, the category
 * navigation, the shop switcher and sign-out. Opened through
 * `useMobileSidebar()` and rendered by `SFOverlayHost` once it first opens.
 */
import { usePage } from '@client/composables/usePage'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconUserSignout from '@assets/icons/user/signout.svg'
import type { NavigationItem } from '@scayle/storefront/types'
import { computed, watch } from 'vue'
import { useEventListener, useScrollLock } from '@vueuse/core'
import { useRouterEvent } from '@client/composables/useRouterEvent'
import { useAuthentication } from '@client/composables/useAuthentication'
import { isPartialReload } from '@client/utils/router'
import { vPopover } from '@client/directives/popover'
import SFShopSwitcher from '@client/components/shopSwitcher/SFShopSwitcher.vue'
import SFSlideInTransition from '../../transitions/SFSlideInTransition.vue'
import SFSearchField from '../../form/SFSearchField.vue'
import SFMobileNavigation from './SFMobileNavigation.vue'

const { open, navigationItems } = defineProps<{
  /**
   * Id for the sidebar root, referenced by the menu toggle's `aria-controls`.
   */
  id: string
  /**
   * Whether the mobile sidebar is currently open and visible.
   */
  open: boolean
  /**
   * Array of navigation tree items for the mobile menu, including categories and pages.
   */
  navigationItems?: NavigationItem[]
  /**
   * Menu toggle in the header. The sidebar follows it in the keyboard order,
   * although it is rendered at the end of the page.
   */
  toggleElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  /** Asks the overlay to close the sidebar. */
  close: []
}>()

const page = usePage()
const customer = computed(() => page.props.customer)
const { logout } = useAuthentication()

const isScrollLocked = useScrollLock(() =>
  import.meta.env.SSR ? undefined : document.documentElement,
)
watch(
  () => open,
  (value) => {
    isScrollLocked.value = value
  },
  { immediate: true },
)

const handleLogout = async () => {
  const success = await logout()
  if (success) {
    emit('close')
  }
}
// Close on real navigation. Partial reloads and prefetch visits are not
// navigation and would dismiss the sidebar while the user is still on the
// current page — `useBasket`, `useWishlist` and `useCustomer` all reload props
// in place from links the sidebar itself renders.
useRouterEvent('before', (event) => {
  if (isPartialReload(event.detail.visit)) {
    return
  }
  emit('close')
})

// Inertia skips the `before` event for history navigations, so Back would
// otherwise leave the sidebar over the new page with the scroll still locked:
// the sidebar is created by the persistent `Layout.vue`, so it survives the
// page swap. Same listener `SFSlideIn` uses, for the same reason.
useEventListener('popstate', () => {
  if (open) {
    emit('close')
  }
})
</script>
