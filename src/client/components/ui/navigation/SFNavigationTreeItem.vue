<template>
  <component
    :is="isLink ? SFLink : 'div'"
    v-bind="
      isLink
        ? {
            to: navigationItem.href,
            target: navigationItem.openInNewWindow ? '_blank' : '_self',
            raw: true,
          }
        : {}
    "
    :class="{
      'mr-3 block w-fit content-center rounded-sm p-1 text-lg/5 font-normal text-(--textColor) transition-all hover:bg-(--backgroundColor)':
        !raw && isLink,
      'mr-0 bg-(--backgroundColor)': isActive && !raw && isLink,
      'min-h-5 w-fit p-1 text-lg/5 font-semibold text-(--textColor)':
        !raw && !isLink,
    }"
    :style="style"
  >
    <div
      v-if="navigationItem.icon"
      class="flex items-center gap-2"
      data-testid="navigation-item"
    >
      <!-- NOTE: Originally a '<object>' tag was used to load the external SVG icon.
        This allowed the icon to be modified in regards to its visual appearance (color),
        but caused issues due to browsers`content-security-policy` settings, which resulted
        in delayed loading of the SVG icons and layout shifts per navigation tree item with a SVG icon.
        To mitigate this, `<img>` with the `preload` attribute is used,
        but SVG icon coloring is not possible anymore. -->
      <img
        :src="navigationItem.icon"
        alt=""
        aria-hidden="true"
        class="pointer-events-none size-4"
        tabindex="-1"
      />
      <span>
        <slot>
          {{ navigationItem.name }}
        </slot>
      </span>
    </div>
    <span v-else>
      <slot>
        {{ navigationItem.name }}
      </slot>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import type { NavigationItem } from '@scayle/storefront/types'

const {
  navigationItem,
  raw = false,
  isActive = false,
  disabledLink,
} = defineProps<{
  /**
   * The navigation item to display.
   */
  navigationItem: NavigationItem
  /**
   * Whether the navigation item is raw.
   */
  raw?: boolean
  /**
   * Whether the navigation item is active.
   */
  isActive?: boolean
  /**
   * Whether the navigation item is disabled.
   */
  disabledLink?: boolean
}>()

const disabled = computed<boolean>(
  () => disabledLink || navigationItem.disabled,
)

const isLink = computed(() => {
  return navigationItem.href && !disabled.value
})

const style = computed(() => {
  if (!navigationItem?.linkColor) {
    return {
      '--backgroundColor': 'var(--color-gray-200)',
      '--textColor': isLink.value
        ? 'var(--color-secondary)'
        : 'var(--color-primary)',
    }
  }

  return {
    '--backgroundColor': `rgb(from ${navigationItem?.linkColor} r g b / 0.1)`,
    '--textColor': navigationItem?.linkColor,
  }
})
</script>
