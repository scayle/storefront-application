<template>
  <div
    class="mt-1 flex items-center space-x-2 rounded-md bg-status-alert/5 px-3 py-1.5 text-sm/4 text-status-alert lg:mt-0.5"
    data-testid="basket-card-sold-out-title"
  >
    <IconAvailabilitySoldout class="size-4" />
    <span>
      {{ $t('common.sold_out_long') }}
    </span>
  </div>
</template>

<script setup lang="ts">
import IconAvailabilitySoldout from '@assets/icons/availability/soldout.svg'
</script>
