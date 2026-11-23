<template>
  <CmsHead />
  <section :key="pageKey" v-editable="pageData?.story?.content" class="w-full">
    <StoryblokBlockDispatch
      v-for="element in contentElements"
      :key="element._uid"
      :content-element="element"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import type { CMSPageData } from '@shared/types/cms/storyblok'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import { useStoryblokEditor } from '../composables/useStoryblokEditor'
import CmsHead from './CmsHead.vue'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

/**
 * Multi-root template (`CmsHead` plus the content `section`), so fallthrough
 * attributes are consumed via `useAttrs` and deliberately not rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

const { data } = defineProps<{
  data: CMSPageData
}>()

const pageData = ref(data)

watch(
  () => data,
  (nextValue) => {
    pageData.value = nextValue
  },
)

useStoryblokEditor(pageData)

// Marks the first image rendered on this page as the LCP-critical, high-priority one.
provideLcpPriority()

const contentElements = computed(() => {
  const content = pageData.value?.story?.content
  return Array.isArray(content?.content) ? content.content : []
})

const pageKey = computed(() => {
  return String(
    pageData.value?.story?.full_slug ??
      pageData.value?.story?.id ??
      'storyblok-page',
  )
})
</script>
