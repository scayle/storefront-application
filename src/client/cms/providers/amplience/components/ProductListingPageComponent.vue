<template>
  <CmsHead />
  <AmplienceBlockDispatch
    v-for="(child, index) in blocks"
    :key="getBlockKey(child, index)"
    :content-element="child"
  />
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import type { CMSPageData } from '@shared/types/cms/amplience'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import { getBlockKey } from '../utils/blocks'
import { getCmsListingContent } from '../utils/listing'
import { useAmplienceEditor } from '../composables/useAmplienceEditor'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'
import CmsHead from './CmsHead.vue'

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

watch(
  () => data,
  (nextValue) => {
    pageData.value = nextValue
  },
)

// A listing page renders this component twice (teaser above the grid, SEO below),
// so both instances subscribe to the same content form, as they do for Contentful.
useAmplienceEditor(pageData)

// Only the above-the-fold teaser content can hold the LCP image; the SEO block
// renders below the product grid and must stay lazy, so it does not provide a claim.
if (contentType === 'teaser') {
  provideLcpPriority()
}

const blocks = computed(() => {
  const { teaserContent, seoContent } = getCmsListingContent(pageData.value)
  return contentType === 'teaser' ? teaserContent : seoContent
})
</script>
