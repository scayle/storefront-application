<template>
  <nav
    class="flex flex-col gap-y-2"
    data-testid="account-side-menu"
    :aria-label="$t('account.a11y.menu')"
  >
    <SFLink
      v-for="({ id, to, title, active, icon }, index) in items"
      :key="id"
      class="flex items-center gap-x-3 rounded-md px-3 py-2.5 text-lg font-semibold text-secondary duration-300 ease-out hover:bg-gray-100 focus-visible:transition-none"
      :data-testid="`account-side-menu-item-${index}`"
      :class="{ 'bg-gray-200 text-primary!': active }"
      :to="to"
      raw
      :aria-current="active ? 'page' : undefined"
    >
      <component :is="icon" class="size-5 shrink-0" aria-hidden="true" />
      <span>{{ title }}</span>
    </SFLink>
  </nav>
</template>

<script setup lang="ts">
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useAccountMenu } from '@client/composables/useAccountMenu'

const { items } = useAccountMenu()
</script>
