<template>
  <div
    class="flex flex-col items-start gap-1 rounded-xl border border-gray-400 bg-white px-4 py-5 text-secondary"
  >
    <h3
      class="mb-2 heading-section-2"
      data-testid="profile-account-information-headline"
    >
      {{ $t('account.profile.account_information.title') }}
    </h3>
    <SFLabelValue
      :label="$t('account.profile.account_information.customer_number')"
      :value="String(customer.id)"
      :size="TextSize.LARGE"
    />
    <SFLabelValue
      :label="$t('account.profile.account_information.email')"
      :value="customer.email"
      :size="TextSize.LARGE"
    />
    <div
      class="mt-3 flex w-full items-center justify-between rounded-lg bg-gray-200 px-3 py-4.5"
    >
      <span class="flex-1 disclaimer">
        {{ $t('account.profile.account_information.disclaimer') }}
      </span>
      <IconNotifyInfo class="size-3" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Customer } from '@scayle/storefront/types'
import { TextSize } from '@client/utils/constants'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'
import IconNotifyInfo from '@assets/icons/notify/info.svg'

defineProps<{
  /** The currently logged-in customer. */
  customer: Customer
}>()
</script>
