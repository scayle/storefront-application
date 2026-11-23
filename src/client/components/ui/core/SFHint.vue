<template>
  <div
    :class="[
      rootLayoutClass,
      containerClass,
      attrsClassOnRoot ? $attrs.class : undefined,
    ]"
    :role="role"
  >
    <div v-if="showIconColumn" class="size-4 shrink-0 text-primary">
      <slot name="icon">
        <component :is="statusIcon" class="" aria-hidden="true" />
      </slot>
    </div>
    <div
      :class="
        useRowLayout
          ? 'flex min-w-0 flex-1 items-center gap-3'
          : 'w-full min-w-0'
      "
    >
      <component
        :is="tag"
        :class="[messageClass, !attrsClassOnRoot ? $attrs.class : undefined]"
      >
        <template v-if="title">
          <span class="font-semibold">{{ title }}</span
          >{{ ' ' }}
        </template>
        <slot />
      </component>
      <div v-if="$slots.trailing" class="flex shrink-0 items-center gap-3">
        <slot name="trailing" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed, useAttrs, useSlots } from 'vue'
import IconNotifyAlert from '@client/assets/icons/notify/alert.svg'
import IconNotifyInfo from '@client/assets/icons/notify/info.svg'
import IconNotifySuccess from '@client/assets/icons/notify/success.svg'
import IconNotifyWarning from '@client/assets/icons/notify/warning.svg'
import type { NotificationType } from '@client/types'
import { TextTag } from '@client/utils/constants'

defineOptions({ inheritAttrs: false })

const NOTIFICATION_ICONS: Record<NotificationType, Component> = {
  SUCCESS: IconNotifySuccess,
  ERROR: IconNotifyAlert,
  WARNING: IconNotifyWarning,
  INFO: IconNotifyInfo,
}

const {
  tag = TextTag.P,
  title,
  type,
} = defineProps<{
  /**
   * Notification status type. When set, renders the Figma Form notification
   * layout (status background, icon, padding-3, gap-2). Omit for plain
   * typography-only hints without a status icon.
   */
  type?: NotificationType
  /**
   * Optional semibold title rendered before the body text (for example
   * `"Error:"` or `"Heads up!"`). Include any trailing punctuation so the
   * separator style stays in the consumer's control. When omitted, the
   * hint renders as a single-weight string.
   */
  title?: string
  /**
   * Semantic HTML element for the message text. Defaults to `<p>`. Use `span`
   * when the hint sits inline next to another element. Form notifications
   * always wrap content in an outer `<div>`.
   */
  tag?: TextTag
}>()

defineSlots<{
  /** Hint body text rendered with `font-normal`. */
  default: () => unknown
  /** Hint icon rendered with `size-3` and `shrink-0`. */
  icon: () => unknown
  /** Trailing actions or icons, aligned like toast actions. */
  trailing: () => unknown
}>()

const slots = useSlots()
const attrs = useAttrs()

const hasStatusType = computed(() => type !== undefined)

const useRowLayout = computed(
  () =>
    hasStatusType.value ||
    Boolean(title) ||
    Boolean(slots.icon) ||
    Boolean(slots.trailing),
)

const rootLayoutClass = computed(() => {
  if (hasStatusType.value) {
    return 'text-primary flex w-full items-center gap-3 rounded-lg p-3 text-sm'
  }
  if (useRowLayout.value) {
    return 'text-primary flex w-full items-center gap-3 text-sm'
  }
  return 'text-primary w-full'
})

const attrsClassOnRoot = computed(
  () => hasStatusType.value || useRowLayout.value,
)

const messageClass = computed(() => {
  const base = 'min-w-0 flex-1 font-normal'
  if (hasStatusType.value) {
    return base
  }
  if (attrs.class) {
    return base
  }
  return `${base} body-default`
})

const showIconColumn = computed(
  () => hasStatusType.value || Boolean(slots.icon),
)

const containerClass = computed(() => {
  switch (type) {
    case 'SUCCESS':
      return 'bg-status-success-light'
    case 'ERROR':
      return 'bg-status-alert-light'
    case 'WARNING':
      return 'bg-status-warning-light'
    case 'INFO':
      return 'bg-status-info/50'
    default:
      return ''
  }
})

const statusIcon = computed(() => (type ? NOTIFICATION_ICONS[type] : undefined))

const role = computed(() => {
  if (!type) {
    return undefined
  }
  if (type === 'ERROR' || type === 'WARNING') {
    return 'alert'
  }
  return 'status'
})
</script>
