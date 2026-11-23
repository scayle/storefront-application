<template>
  <CmsHead />
  <ContentstackBlockDispatch
    v-for="(child, index) in blocks"
    :key="child?.uid ?? index"
    :content-element="child"
  />
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import type { CMSPageData } from '@shared/types/cms/contentstack'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import { getCmsListingContent } from '../utils/listing'
import { useContentstackEditor } from '../composables/useContentstackEditor'
import CmsHead from './CmsHead.vue'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

/**
 * Multi-root template (`CmsHead` plus the `v-for` block list). The list has no
 * single root to bind to, so fallthrough attributes are consumed via `useAttrs`
 * and deliberately not rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

const { data, contentType } = defineProps<{
  data: CMSPageData
  contentType: 'teaser' | 'seo'
}>()

const pageData = ref(data)

useContentstackEditor(pageData)

// Only the above-the-fold teaser content can hold the LCP image; the SEO block
// renders below the product grid and must stay lazy, so it does not provide a claim.
if (contentType === 'teaser') {
  provideLcpPriority()
}

const blocks = computed(() => {
  const { teaserContent, seoContent } = getCmsListingContent(
    pageData.value?.entry,
  )
  return contentType === 'teaser' ? teaserContent : seoContent
})
</script>
