<template>
  <PageMetaHead :meta="meta" />
  <SFAccountLayout>
    <Deferred data="customer">
      <template #fallback>
        <SFProfileSkeletonLoader />
      </template>
      <h2 class="mb-5 heading-section-1 lg:mb-7" data-testid="profile-headline">
        {{ $t('account.profile.title') }}
      </h2>
      <p
        v-if="customer?.firstName"
        class="mb-1 heading-section-2 leading-5"
        data-testid="profile-greeting"
      >
        {{ $t('common.welcome', { name: customer.firstName }) }}
      </p>
      <p
        class="mb-5 body-large-secondary leading-5 lg:mb-7"
        data-testid="profile-description"
      >
        {{ $t('account.profile.description') }}
      </p>
      <div v-if="customer" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SFProfileAccountInformation
          :customer="customer"
          class="col-span-full"
        />
        <SFProfilePersonalInformation />
        <SFProfilePasswordManagement />
      </div>
    </Deferred>
  </SFAccountLayout>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/account
import { Deferred } from '@inertiajs/vue3'
import SFAccountLayout from '@client/components/account/SFAccountLayout.vue'
import SFProfileAccountInformation from '@client/components/account/profile/SFProfileAccountInformation.vue'
import SFProfilePersonalInformation from '@client/components/account/profile/SFProfilePersonalInformation.vue'
import SFProfilePasswordManagement from '@client/components/account/profile/SFProfilePasswordManagement.vue'
import SFProfileSkeletonLoader from '@client/components/account/profile/SFProfileSkeletonLoader.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import type { SEOMeta } from '@shared/types/SEO'
import { useCustomer } from '@client/composables/useCustomer'

defineProps<{
  meta: SEOMeta
}>()

const { customer } = useCustomer()
</script>
