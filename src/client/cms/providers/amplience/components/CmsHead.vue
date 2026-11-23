<template>
  <Head>
    <link rel="preconnect" :href="mediaOrigin" crossorigin="anonymous" />
  </Head>
</template>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { PRODUCTION_MEDIA_HOST } from '../utils/media'

// Every image and video URL the media builders emit points at this host, so the
// connection is worth opening before the first asset request.
const mediaOrigin = `https://${PRODUCTION_MEDIA_HOST}`
</script>
