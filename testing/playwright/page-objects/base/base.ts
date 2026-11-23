import type { Page } from '@playwright/test'
import { waitForDeferredReloads } from '../../support/deferredReloads'
import { isMobile } from '../../support/utils'

/**
 * Abstract base class for all Page Objects.
 * Provides common properties and helper methods accessible by all derived page objects.
 */
export abstract class Base {
  protected readonly page: Page
  readonly isMobileViewport: boolean

  /**
   * Initializes the Base.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    this.page = page
    this.isMobileViewport = isMobile(page)
  }

  /**
   * Navigates the Playwright page to a specified path.
   * This is a simple wrapper around `page.goto()` that allows for a custom `waitUntil` option.
   *
   * @param page - The Playwright Page object to navigate.
   * @param path - The URL path to navigate to, relative to the configured `baseURL` (e.g., `ROUTES.home`, `ROUTES.basket`). A path that starts with `/` resolves against the origin of `baseURL` and skips the country prefix.
   * @param waitUntil - Optional. An event to wait for before navigation is considered finished.
   * - `'load'`: Waits for the 'load' event to fire (all static resources downloaded).
   * - `'commit'`: Waits for the navigation to successfully start (first byte of response received).
   * - `'domcontentloaded'`: Waits for the 'DOMContentLoaded' event to fire (DOM tree built).
   * - `'networkidle'`: Waits for network activity to cease for a period (common for SPAs).
   * Defaults to Playwright's default for `page.goto()` if not specified.
   */
  async navigate(
    page: Page,
    path: string,
    waitUntil?: 'load' | 'commit' | 'domcontentloaded' | 'networkidle',
  ) {
    await page.goto(path, { waitUntil })
  }

  /**
   * Waits until the deferred props of the Inertia page that is currently shown have arrived.
   * Inertia loads them after the page mounts, and a reply can undo what a test did in the
   * meantime, for example the `variantId` of a size it picked. Call it before an interaction
   * that a late reply could undo. It also works after a visit to another page, where it
   * waits for the groups of the new page. See `waitForDeferredReloads` in
   * `support/deferredReloads.ts` for what it throws.
   */
  async waitForDeferredReloads() {
    await waitForDeferredReloads(this.page)
  }
}
