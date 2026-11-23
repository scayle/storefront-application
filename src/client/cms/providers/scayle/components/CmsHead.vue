<template>
  <Head />
</template>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'

// The default Scayle CMS provider rides on the SAPI CDN, which Layout.vue
// already preconnects to. The empty <Head /> keeps a consistent component
// shape across providers without adding any head content.
</script>
