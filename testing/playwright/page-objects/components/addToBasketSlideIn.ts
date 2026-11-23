import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Base } from '../base/base'

/**
 * Page Object Model for the add-to-basket confirmation slide-in.
 * The slide-in replaces the former add-to-basket toast and opens as a modal
 * dialog on every successful add from the PDP or a gift collection, so most
 * tests need to dismiss it before continuing to interact with the page.
 */
export class AddToBasketSlideIn extends Base {
  /** Dialog container. Only in the DOM once the slide-in has opened at least once. */
  readonly slideIn: Locator
  /** Close control in the sticky header. */
  readonly closeButton: Locator
  /** Product card for the line that was just added. */
  readonly productCard: Locator
  /** Primary CTA leading to the basket page. */
  readonly goToBasketButton: Locator
  /** Secondary CTA leading to checkout. */
  readonly goToCheckoutButton: Locator
  /** Recommendation slider, rendered on mobile. */
  readonly recommendationsSlider: Locator
  /** Recommendation grid, rendered on desktop. */
  readonly recommendationsGrid: Locator
  /** Product cards of the recommendations, whichever layout renders them. */
  readonly recommendationCards: Locator

  /**
   * Initializes the AddToBasketSlideIn Page Object.
   * @param page - The Playwright Page object.
   */
  constructor(page: Page) {
    super(page)

    this.slideIn = page.getByTestId('add-to-basket-slide-in')
    this.closeButton = page.getByTestId('add-to-basket-slide-in-close')
    this.productCard = this.slideIn.getByTestId('add-to-basket-slide-in-card')
    this.goToBasketButton = page.getByTestId(
      'add-to-basket-slide-in-go-to-basket',
    )
    this.goToCheckoutButton = page.getByTestId(
      'add-to-basket-slide-in-go-to-checkout',
    )
    this.recommendationsSlider = page.getByTestId(
      'add-to-basket-slide-in-recommendations-slider',
    )
    this.recommendationsGrid = page.getByTestId(
      'add-to-basket-slide-in-recommendations-grid',
    )
    this.recommendationCards = this.slideIn.locator('[data-testid^="article-"]')
  }

  /**
   * Asserts that the slide-in is open and exposed as a modal dialog.
   */
  async assertIsVisible() {
    await expect(this.slideIn).toBeVisible({ timeout: 15000 })
    await expect(this.slideIn).toHaveAttribute('aria-modal', 'true')
  }

  /**
   * Closes the slide-in via its close control and waits until it is gone.
   * Safe to call when the slide-in never opens.
   *
   * The panel appears well after the add request resolves: the basket is
   * reloaded first, and the panel itself is an async chunk that has to be
   * fetched. `isVisible()` does not retry, so it has to be preceded by an
   * explicit wait or it samples an empty DOM and skips a dismissal that was
   * needed, leaving a modal dialog over an inert page.
   */
  async dismiss() {
    await this.slideIn
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})

    if (!(await this.slideIn.isVisible())) {
      return
    }

    await this.closeButton.click()
    await expect(this.slideIn).toBeHidden({ timeout: 15000 })
  }

  /**
   * Closes the slide-in with the Escape key. Covers the keyboard dismissal path
   * separately from the close control.
   */
  async dismissWithEscape() {
    await this.page.keyboard.press('Escape')
    await expect(this.slideIn).toBeHidden({ timeout: 15000 })
  }
}
