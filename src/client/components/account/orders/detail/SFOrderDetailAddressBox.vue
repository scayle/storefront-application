<template>
  <SFOrderSuccessDetailBox :title="title">
    <div class="flex flex-col gap-1 body-default-secondary">
      <span v-for="(line, index) in address.lines" :key="`${line}-${index}`">
        {{ line }}
      </span>
    </div>
  </SFOrderSuccessDetailBox>
</template>

<script setup lang="ts">
import type { OrderAddress } from '@scayle/storefront/types'
import SFOrderSuccessDetailBox from '@client/components/orderSuccess/SFOrderSuccessDetailBox.vue'

defineProps<{
  /** The address box title. */
  title: string
  /** The formatted address to display. */
  address: OrderAddress
}>()
</script>
