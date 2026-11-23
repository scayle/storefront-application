<template>
  <SFFadeInTransition :duration="150">
    <SFButton
      v-if="!arrivedState.top"
      variant="raw"
      class="sf-icon-button-shadow z-20 size-13 rounded-full"
      data-testid="scroll-to-top-button"
      :aria-label="$t('global.scroll_to_top_label')"
      @click="scrollToTop"
    >
      <IconNavigationUp class="size-4 fill-gray-500" />
    </SFButton>
  </SFFadeInTransition>
</template>

<script setup lang="ts">
import { useScroll } from '@vueuse/core'
import SFFadeInTransition from '@client/components/ui/transitions/SFFadeInTransition.vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconNavigationUp from '@client/assets/icons/navigation/up.svg'

// `window` is referenced at setup top level, which also runs during SSR. Guard
// the target so the bare global is never touched on the server (VueUse treats a
// nullish target as inert, keeping `arrivedState.top` at its default of `true`).
const { arrivedState } = useScroll(import.meta.env.SSR ? undefined : window)

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
</script>
