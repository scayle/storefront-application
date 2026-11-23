<template>
  <div class="container flex flex-col gap-x-8 pt-6 lg:flex-row lg:pt-10">
    <SFAccountSideMenu
      class="sticky top-8 hidden h-fit w-64 shrink-0 lg:flex"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <h1
        class="mb-5 heading-section-1 lg:sr-only"
        data-testid="account-headline"
      >
        {{ $t('account.page.title') }}
      </h1>
      <SFAccountTabs class="mb-6 lg:hidden" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import SFAccountTabs from './SFAccountTabs.vue'
import SFAccountSideMenu from './SFAccountSideMenu.vue'
</script>
