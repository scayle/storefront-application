<template>
  <Head>
    <template v-if="config.country.publicFields?.consentManagementRequired">
      <component
        :is="'script'"
        id="usercentrics-cmp"
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        src="https://web.cmp.usercentrics.eu/ui/loader.js"
        async
        defer
        :data-settings-id="config.config.publicFields?.userCentricsAppId"
      />
    </template>
  </Head>
</template>

<script setup lang="ts">
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { loadGtmWhenIdle } from '@client/utils/gtmBootstrap'
import { Head } from '@inertiajs/vue3'

const { config } = useStorefrontConfig()

// GTM stays out of the document head and off the hydration path, see
// `loadGtmWhenIdle`. A user whose first page is the layout-less Error page
// gets GTM on the first page with a layout.
const gtmId = config.value.config.publicFields?.gtmId
if (!import.meta.env.SSR && gtmId) {
  loadGtmWhenIdle(gtmId)
}
</script>
