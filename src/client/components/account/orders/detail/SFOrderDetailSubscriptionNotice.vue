<template>
  <SFHint
    type="INFO"
    :title="$t('subscription.order_notice.title')"
    data-testid="order-detail-subscription-notice"
  >
    {{ $t('subscription.order_notice.text') }}
    <template #trailing>
      <SFLink
        :to="routes.accountSubscriptions"
        class="font-semibold underline"
        data-testid="order-detail-subscription-notice-link"
      >
        {{ $t('subscription.order_notice.link') }}
      </SFLink>
    </template>
  </SFHint>
</template>

<script setup lang="ts">
import { routes } from '@shared/routes'
import SFHint from '@client/components/ui/core/SFHint.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
</script>
