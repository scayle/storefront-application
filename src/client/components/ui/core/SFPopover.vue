<!-- eslint-disable vuejs-accessibility/mouse-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Only reports hover to the parent. The interactive element is the trigger in the `action` slot, which gives keyboard users their own way to open the content. -->
<template>
  <div
    data-testid="popoverContainer"
    class="relative flex h-full"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
  >
    <div
      class="inline-flex size-full items-center justify-center"
      data-testid="header-user-button"
    >
      <slot name="action" />
    </div>
    <ClientOnly>
      <!-- The transparent border is crucial for keeping the hover state while moving the cursor between the action and content, prevent the popover from flickering. -->
      <SFFadeInTransition v-if="!keepMounted" appear>
        <div
          v-if="isOpen"
          class="absolute top-full right-0 z-20 min-w-max overflow-hidden border-t-8 border-transparent bg-clip-content"
          data-testid="popover-content"
        >
          <div
            class="overflow-hidden rounded-lg border border-gray-400 bg-white"
          >
            <slot name="content" />
          </div>
        </div>
      </SFFadeInTransition>
      <!--
        `keepMounted` keeps the content in the DOM so a `focusout` handler on
        a parent can resolve `relatedTarget` against the popover. We can't use
        a Vue <Transition> here (it works on mount/unmount), so the fade is
        driven by CSS via `transition-behavior: allow-discrete` plus
        `@starting-style` (Tailwind v4 `transition-discrete` + `starting:`).
      -->
      <div
        v-else
        :hidden="!isOpen"
        :inert="!isOpen"
        class="absolute top-full right-0 z-20 min-w-max overflow-hidden border-t-8 border-transparent bg-clip-content transition-[opacity,display] transition-discrete duration-200 starting:opacity-0 [hidden]:opacity-0"
        data-testid="popover-content"
      >
        <div class="overflow-hidden rounded-lg border border-gray-400 bg-white">
          <slot name="content" />
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
<!-- eslint-enable vuejs-accessibility/mouse-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->

<script setup lang="ts">
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import SFFadeInTransition from '@client/components/ui/transitions/SFFadeInTransition.vue'

const { isOpen = false, keepMounted = false } = defineProps<{
  /**
   * Controls the visibility of the popover content. Use this for programmatic control.
   */
  isOpen?: boolean
  /**
   * Keeps the popover content in the DOM while closed (toggled via the
   * `hidden` attribute instead of `v-if`). Required by consumers that rely
   * on focus tracking across the trigger/content boundary, since `relatedTarget`
   * on a `focusout` event must still resolve to a mounted node. The fade is
   * then driven by CSS (`transition-behavior: allow-discrete` + `@starting-style`)
   * since a Vue `<Transition>` would only fire on mount/unmount.
   */
  keepMounted?: boolean
}>()

defineEmits<{ mouseenter: []; mouseleave: [] }>()
</script>
