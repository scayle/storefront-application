<template>
  <div class="w-full">
    <SFSkeletonLoader
      type="custom"
      class="mb-2 aspect-product rounded-lg bg-gray-300 lg:mb-3"
    />
    <SFSkeletonLoader type="custom" class="mb-3 size-12 rounded-md lg:hidden" />
    <SFSkeletonLoader
      type="custom"
      class="mb-3 h-3 max-w-26 rounded-lg bg-gray-300"
    />
    <SFSkeletonLoader
      type="custom"
      class="mb-5 h-3 max-w-51.5 rounded-lg bg-gray-300"
    />
    <SFSkeletonLoader
      type="custom"
      class="h-4 max-w-20 rounded-lg bg-gray-300"
    />
  </div>
</template>

<script setup lang="ts">
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
</script>
