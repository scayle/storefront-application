<template>
  <PageMetaHead :meta="meta" />
  <section
    class="container mt-24 flex flex-col items-center justify-center space-y-2 text-primary"
  >
    <IconLogoSingt
      class="mb-6 size-24"
      aria-hidden="true"
      data-testid="not-found-logo"
    />

    <div
      class="mb-6! rounded-full bg-accent/10 px-3 py-0.5 text-sm/5 text-accent slashed-zero"
      data-testid="not-found-code"
    >
      {{ $t('error.error_code_label') }} 404
    </div>

    <h1 class="text-center heading-page" data-testid="not-found-title">
      {{ $t('error.page_not_found_title') }}
    </h1>

    <p
      class="mt-4 text-center body-large-secondary"
      data-testid="not-found-message"
    >
      {{ $t('error.page_not_found_message') }}
    </p>

    <SFButton
      variant="secondary"
      :to="routes.home"
      class="mt-12"
      data-testid="not-found-continue-shopping"
    >
      {{ $t('common.continue_shopping') }}
    </SFButton>
  </section>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/errors-and-logging
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconLogoSingt from '@assets/icons/logo/signet.svg'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import type { SEOMeta } from '@shared/types/SEO'
import { routes } from '@shared/routes'

const { t } = useI18n()

// Built here rather than on the server: the page takes no props, so
// `@scayle/storefront` can render it for any unmatched route or `ctx.notFound()`.
const meta = computed<SEOMeta>(() => ({
  title: t('error.page_not_found_title'),
  robots: 'noindex, nofollow',
}))
</script>
