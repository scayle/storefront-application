<template>
  <div
    class="flex flex-col items-center gap-2 rounded-xl bg-status-success-light p-5 text-center"
    data-testid="success-greeting-box"
  >
    <div
      class="mb-2 size-10 content-center rounded-full border-2 border-primary bg-white"
    >
      <IconCheckmarkDefault class="mx-auto size-3.5" />
    </div>
    <h2 class="heading-section-2" data-testid="success-greeting-box-headline">
      {{ $t('order_success_page_greeting.title') }}
    </h2>
    <p class="disclaimer">
      {{ $t('order_success_page_greeting.email_confirmation') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import IconCheckmarkDefault from '@assets/icons/checkmark/default.svg'
</script>
