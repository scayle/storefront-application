<template>
  <nav
    ref="navRef"
    data-testid="account-tabs"
    :aria-label="$t('account.a11y.menu')"
  >
    <SFItemSlider fade class="scrollbar-hide w-full snap-x snap-mandatory">
      <SFLink
        v-for="({ id, to, shortTitle, active }, index) in items"
        :key="id"
        class="mr-2 inline-flex h-11 shrink-0 snap-start items-center justify-center rounded-xl bg-gray-200 px-8 text-md font-semibold whitespace-nowrap text-secondary transition"
        :data-testid="`account-area-tab-${index}`"
        :class="{
          'bg-white text-primary! ring-2 ring-primary ring-inset': active,
        }"
        :to="to"
        raw
        :aria-current="active ? 'page' : undefined"
        @click="onItemClick"
      >
        {{ shortTitle }}
      </SFLink>
    </SFItemSlider>
  </nav>
</template>

<script setup lang="ts">
import SFLink from '@client/components/ui/links/SFLink.vue'
import SFItemSlider from '@client/components/ui/core/SFItemSlider.vue'
import { useAccountMenu } from '@client/composables/useAccountMenu'
import { useScrollActiveIntoView } from '@client/composables/useScrollActiveIntoView'

const { items } = useAccountMenu()
const { navRef, onItemClick } = useScrollActiveIntoView()
</script>
