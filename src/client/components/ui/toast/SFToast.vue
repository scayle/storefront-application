<template>
  <div
    class="flex w-full items-start gap-2 rounded-lg p-3 text-md text-primary lg:w-max lg:max-w-[90vw]"
    :class="containerClass"
    data-testid="toast-info"
    :role="role"
  >
    <component
      :is="statusIcon"
      class="size-4 shrink-0 text-primary"
      aria-hidden="true"
    />
    <p class="min-w-0 flex-1 font-normal">
      <template v-if="notification.title">
        <span class="font-semibold">{{ notification.title }}</span>
      </template>
      {{ notification.message }}
    </p>
    <div class="flex shrink-0 items-start gap-3">
      <SFLink
        v-if="notification.action?.href"
        :key="`link-${notification.action.text}`"
        :to="notification.action.href"
        @click="onClick($event, notification.action)"
      >
        {{ notification.action.text }}
      </SFLink>
      <button
        v-else-if="notification.action?.text"
        type="button"
        class="text-primary underline transition duration-200 ease-linear hover:text-accent"
        data-testid="toast-info-button"
        @click="onClick($event, notification.action)"
      >
        {{ notification.action.text }}
      </button>
      <SFButton
        :variant="ButtonVariant.RAW"
        :size="Size.SM"
        :aria-label="$t('notification.dismiss')"
        data-testid="toast-dismiss"
        @click="close"
      >
        <span class="inline-flex h-4 items-center justify-center">
          <IconNavigationClose class="size-3" />
        </span>
      </SFButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import IconNotifyAlert from '@client/assets/icons/notify/alert.svg'
import IconNotifyInfo from '@client/assets/icons/notify/info.svg'
import IconNotifySuccess from '@client/assets/icons/notify/success.svg'
import IconNotifyWarning from '@client/assets/icons/notify/warning.svg'
import IconNavigationClose from '@client/assets/icons/navigation/close.svg'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useToast } from '@client/composables/useToast'
import type {
  NotificationActionHandler,
  NotificationType,
  StorefrontNotification,
} from '@client/types'

import { ButtonVariant, Size } from '@client/utils/constants'

const NOTIFICATION_ICONS: Record<NotificationType, Component> = {
  SUCCESS: IconNotifySuccess,
  ERROR: IconNotifyAlert,
  WARNING: IconNotifyWarning,
  INFO: IconNotifyInfo,
}

const { notification } = defineProps<{
  /**
   * Notification payload from the toast stack, including type, message, and optional title and action.
   */
  notification: StorefrontNotification
}>()

const { close: closeToast } = useToast()

const containerClass = computed(() => {
  switch (notification.type) {
    case 'SUCCESS':
      return 'bg-status-success-light'
    case 'ERROR':
      return 'bg-status-alert-light'
    case 'WARNING':
      return 'bg-status-warning-light'
    case 'INFO':
    default:
      return 'bg-status-info'
  }
})

const role = computed(() => {
  const { type } = notification
  if (type === 'ERROR' || type === 'WARNING') {
    return 'alert'
  }
  return 'status'
})

const statusIcon = computed(() => NOTIFICATION_ICONS[notification.type])

const close = () => closeToast(notification.id)

const onClick = (event: Event, handler: NotificationActionHandler) => {
  if (!handler.onClick) {
    return
  }
  event.preventDefault()
  event.stopImmediatePropagation()
  handler.onClick({ close })
}
</script>
