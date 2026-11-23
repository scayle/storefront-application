<template>
  <div>
    <div class="mb-5 flex flex-col items-start gap-2 lg:mb-7">
      <SFSkeletonLoader type="headline" class="mb-4 h-6 w-52" />
      <SFSkeletonLoader type="button" class="h-4 w-40" />
      <SFSkeletonLoader type="button" class="h-4 w-full max-w-112" />
    </div>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SFSkeletonLoader
        type="button"
        class="col-span-full h-44 rounded-xl"
        full-width
      />
      <SFSkeletonLoader type="button" class="h-124.5 rounded-xl" full-width />
      <SFSkeletonLoader type="button" class="h-124.5 rounded-xl" full-width />
    </div>
  </div>
</template>

<script setup lang="ts">
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
</script>
