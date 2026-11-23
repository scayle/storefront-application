<template>
  <!-- A prop, not a `<title>` child: see `PageMetaHead`. -->
  <Head :title="$t('error.unknown_error_title')" />
  <main
    class="container mt-24 flex flex-col items-center justify-center space-y-2 text-primary"
  >
    <IconLogoSingt
      class="mb-6 size-24"
      aria-hidden="true"
      data-testid="error-logo"
    />

    <div
      class="mb-6! rounded-full bg-accent/10 px-3 py-0.5 text-sm/5 text-accent slashed-zero"
      data-testid="error-code"
    >
      {{ $t('error.error_code_label') }} {{ code }}
    </div>

    <h1 class="text-center heading-page" data-testid="error-title">
      {{ $t('error.unknown_error_title') }}
    </h1>

    <p
      class="mt-4 text-center body-large-secondary"
      data-testid="error-message"
    >
      {{ $t('error.unknown_error_message') }}
    </p>

    <a
      :href="basePath"
      class="mt-12 text-accent underline"
      data-testid="error-home-link"
    >
      {{ $t('common.continue_shopping') }}
    </a>

    <template v-if="isDev && errorHtml">
      <button
        type="button"
        class="mt-12 cursor-pointer text-sm text-secondary underline hover:text-primary"
        data-testid="error-open-technical-details"
        @click="errorDialogRef?.showModal()"
      >
        {{ $t('error.technical_details_title') }}
      </button>

      <dialog
        id="youch-error-dialog"
        ref="errorDialog"
        class="m-auto w-[min(96vw,1200px)] max-w-none rounded-md border border-primary/20 p-0 shadow-xl backdrop:bg-primary/50"
      >
        <div
          class="flex items-center justify-between border-b border-primary/20 px-4 py-3"
        >
          <p class="text-lg/6 font-semibold text-primary">
            {{ $t('error.technical_details_title') }}
          </p>
          <form method="dialog">
            <button
              type="submit"
              class="cursor-pointer text-sm text-secondary hover:text-primary"
              data-testid="error-close-technical-details"
            >
              <CloseIcon class="size-4" />
            </button>
          </form>
        </div>
        <!--
          `sandbox="allow-scripts"` (no `allow-same-origin`) runs Youch's own
          report scripts in an opaque origin, so the dev-only `srcdoc` content
          cannot reach the parent window, cookies, or localStorage even if
          `import.meta.env.DEV` is ever truthy outside local dev.
        -->
        <iframe
          title="Youch error details"
          :srcdoc="errorHtml"
          sandbox="allow-scripts"
          class="h-[70vh] w-full bg-white"
        />
      </dialog>
    </template>
  </main>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/errors-and-logging
import { Head } from '@inertiajs/vue3'
import { nextTick, onMounted, useTemplateRef } from 'vue'
import CloseIcon from '@assets/icons/navigation/close.svg'
import IconLogoSingt from '@assets/icons/logo/signet.svg'

interface Props {
  /** HTTP status code rendered in the page, defaults to 500. */
  code?: number
  /**
   * Active BCP 47 locale passed by `renderErrorPage` (the Error page carries no
   * `storefront` shared prop to read it from). Declared so it is a real prop
   * rather than a fallthrough attribute; the SSR/client entry uses it to create
   * the i18n instance, so the `$t` copy below localizes to it.
   */
  locale?: string
  /**
   * Dev-only Youch HTML error report shown in the technical-details iframe.
   * Only set on 5xx responses in development.
   */
  errorHtml?: string
  /**
   * Path of the application root the home link points to, passed by
   * `renderErrorPage` (the Error page carries no `storefront` shared prop).
   */
  basePath: string
}

// Bare-bones error page: depends only on Inertia (no shared data, no
// `storefront` prop, no layout, no meta mapper, no tracking) so it always
// renders, even when no storefront context is available. Declaring an explicit
// (undefined) `layout` opts out of the default layout: the page resolver keys
// off `'layout' in module.default`, so the key being present is enough to skip
// the default, while `undefined` tells Inertia to render with no layout.
defineOptions({ layout: undefined })

const { code = 500, errorHtml } = defineProps<Props>()
const isDev = import.meta.env.DEV

const errorDialogRef = useTemplateRef<HTMLDialogElement>('errorDialog')

onMounted(() => {
  if (!errorHtml || !isDev) {
    return
  }

  nextTick(() => {
    if (errorDialogRef.value && !errorDialogRef.value.open) {
      errorDialogRef.value.showModal()
    }
  })
})
</script>
