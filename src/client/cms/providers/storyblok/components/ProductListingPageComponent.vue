<template>
  <CmsHead />
  <StoryblokBlockDispatch
    v-for="child in blocks"
    :key="(child as StoryblokBlock)._uid"
    :content-element="child as StoryblokBlock"
  />
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import type { StoryblokBlock, CMSPageData } from '@shared/types/cms/storyblok'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import { getCmsListingContent } from '../utils/listing'
import { useStoryblokEditor } from '../composables/useStoryblokEditor'
import CmsHead from './CmsHead.vue'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

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

useStoryblokEditor(pageData)

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
