<!-- No-op: the SCAYLE default provider does not support PLP CMS content. -->
<template>
  <CmsHead />
  <div />
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'
import type { CMSPageData } from '@shared/types/cms/scayle'
import CmsHead from './CmsHead.vue'

/**
 * Multi-root template (`CmsHead` plus the placeholder `div`; the SCAYLE provider
 * has no PLP CMS content), so fallthrough attributes are consumed via `useAttrs`
 * and deliberately not rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

defineProps<{
  data: CMSPageData
  contentType: 'teaser' | 'seo'
}>()
</script>
