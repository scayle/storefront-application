<template>
  <Deferred data="customer">
    <SFLink
      :to="route"
      raw
      class="flex size-9.5 items-center justify-center rounded-md p-1 lg:hidden"
      :aria-label="mobileLinkLabel"
      data-testid="header-user-button-mobile"
    >
      <IconUser class="size-6" />
    </SFLink>
    <!-- Fallback to signin link until the user data is loaded and we know whether the user is logged in or not. -->
    <template #fallback>
      <SFLink
        :to="getSignInRoute($page.url)"
        raw
        class="flex size-9.5 items-center justify-center rounded-md p-2 lg:hidden"
        :aria-label="$t('common.sign_in')"
        data-testid="header-user-button-mobile"
      >
        <IconUser class="size-6 fill-primary" />
      </SFLink>
    </template>
  </Deferred>

  <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events -- Hover only opens the popover for pointer users. Keyboard users open it with the trigger button, and `handleBlur` closes it. -->
  <SFPopover
    ref="popoverRoot"
    class="max-lg:hidden"
    :is-open="isOpen"
    keep-mounted
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false"
  >
    <template #action>
      <SFButton
        :ref="setTrigger"
        type="button"
        variant="raw"
        :aria-controls="popoverId"
        :aria-expanded="isOpen"
        :aria-label="$t('common.account')"
        data-testid="account-popover-trigger"
        class="flex size-9.5 items-center justify-center rounded-md p-2 hover:bg-gray-200"
        @click="handleTriggerClick"
        @blur="handleBlur"
      >
        <IconUser class="size-6 fill-primary" />
      </SFButton>
    </template>
    <template #content>
      <div
        :id="popoverId"
        class="flex w-64 flex-col"
        data-testid="account-popover"
        @focusout="handleBlur"
      >
        <Deferred data="customer">
          <template #fallback />
          <template v-if="customer">
            <div
              class="space-y-1 border-b border-gray-400 p-5"
              data-testid="account-popover-user"
            >
              <div
                class="text-md font-semibold"
                data-testid="account-popover-name"
              >
                {{ $t('common.welcome', { name: displayName }) }}
              </div>
              <div
                class="text-sm/5 text-secondary"
                data-testid="account-popover-email"
              >
                {{ customer.email }}
              </div>
            </div>

            <div class="border-b border-gray-400 p-2">
              <SFLink
                v-for="{ id, to, icon, title } in accountLinks"
                :key="id"
                :to="to"
                class="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-secondary hover:bg-gray-200 hover:text-primary"
                :data-testid="`account-popover-link-${id}`"
              >
                <component :is="icon" class="size-4 shrink-0" />
                {{ title }}
              </SFLink>
            </div>

            <div class="p-2">
              <SFButton
                type="button"
                variant="secondary"
                is-full-width
                data-testid="account-popover-logout-button"
                :loading="isLoggingOut"
                :disabled="isLoggingOut"
                @click="handleLogout"
              >
                {{ $t('common.sign_out') }}
              </SFButton>
            </div>
          </template>
          <template v-else>
            <div class="space-y-2 p-2">
              <SFButton
                :to="getSignInRoute($page.url)"
                is-full-width
                data-testid="account-popover-login-button"
              >
                {{ $t('common.sign_in') }}
              </SFButton>
              <SFButton
                variant="secondary"
                is-full-width
                data-testid="account-popover-register-button"
                :to="getSignInRoute($page.url, true)"
              >
                {{ $t('common.sign_up') }}
              </SFButton>
            </div>
          </template>
        </Deferred>
      </div>
    </template>
  </SFPopover>
</template>

<script setup lang="ts">
import SFPopover from '@client/components/ui/core/SFPopover.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import IconUser from '@assets/icons/user/account.svg'
import { Deferred } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import { localizeLink } from '@scayle/storefront/shared'
import { computed, ref, useAttrs, useId, useTemplateRef } from 'vue'
import { useReturnFocus } from '@client/composables/useReturnFocus'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { getSignInRoute, routes } from '@shared/routes'
import { useAuthentication } from '@client/composables/useAuthentication'
import type { Customer } from '@scayle/storefront/types'
import { useI18n } from 'vue-i18n'
import { useRoute } from '@client/composables/useRoute'
import { useAccountMenu } from '@client/composables/useAccountMenu'

/**
 * Multi-root template (the mobile `Deferred` link branch plus the desktop
 * `SFPopover`). The two responsive roots are mutually exclusive with no shared
 * DOM element, so fallthrough attributes are consumed via `useAttrs` and
 * deliberately not rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

const page = usePage()
const { navigate } = useRoute()
const { t } = useI18n()
const serverCustomer = computed<Customer | null | undefined>(
  () => page.props.customer,
)
const isLoggingOut = ref(false)
const customer = computed(() =>
  isLoggingOut.value ? undefined : serverCustomer.value,
)
const route = computed(() =>
  customer.value
    ? localizeLink(page.props.storefront, routes.account)
    : getSignInRoute(localizeLink(page.props.storefront, routes.account)),
)
const mobileLinkLabel = computed(() =>
  customer.value ? t('common.account') : t('common.sign_in'),
)
const { logout } = useAuthentication()
const isOpen = ref(false)
const { setTrigger, returnFocus } = useReturnFocus()
const popoverRoot =
  useTemplateRef<InstanceType<typeof SFPopover>>('popoverRoot')
const popoverId = `account-popover-${useId().replace(/:/g, '')}`

const displayName = computed(() => {
  return customer.value?.firstName?.trim() || customer.value?.email || ''
})

const { items: accountLinks } = useAccountMenu()

const handleTriggerClick = (event: MouseEvent) => {
  // `MouseEvent.detail === 0` indicates a non-pointer activation.
  if (event.detail === 0) {
    isOpen.value = !isOpen.value
    return
  }
  navigate(route.value)
}

const handleBlur = (event: FocusEvent) => {
  // SFPopover's root wraps both the trigger and the popover content as
  // siblings — keep the popover open while focus moves between them.
  const root = popoverRoot.value?.$el as HTMLElement | undefined

  if (root?.contains(event.relatedTarget as Node)) {
    return
  }

  isOpen.value = false
}

const handleLogout = async () => {
  isOpen.value = false
  isLoggingOut.value = true
  const success = await logout()
  if (success) {
    await returnFocus({ defer: true })
  }
  isLoggingOut.value = false
}
</script>
