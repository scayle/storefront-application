<template>
  <PageMetaHead
    v-if="meta"
    :meta="meta"
    :hreflangs="hreflangs"
    :json-ld="jsonLd"
  />
  <div class="container lg:pt-4">
    <PageComponent :data="pageData" />
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms
import type { CMSPageData } from '@cms-shared'
import type { Hreflang } from '@scayle/storefront/types'
import type { HomepageJsonLd, SEOMeta } from '@shared/types/SEO'
import PageComponent from '@cms-client/components/PageComponent.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'

defineProps<{
  pageData: CMSPageData
  slug: string
  meta?: SEOMeta
  hreflangs?: Hreflang[]
  /** OnlineStore structured data, sent on the homepage only. Server-only: absent after a client-side navigation. */
  jsonLd?: HomepageJsonLd
}>()
</script>
