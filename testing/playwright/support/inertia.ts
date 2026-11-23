import type { Page } from 'playwright-core'

/**
 * Reads the Inertia page payload of the loaded page. Handles the three ways a deployment
 * can ship it: JSON inline in `[data-page]`, a key in `#app[data-page]` that names a
 * `script[type="application/json"]` element, and a script element with a bare `data-page`.
 *
 * @param page The Playwright Page object, on a page that has loaded.
 * @returns The parsed payload, or `undefined` when the page has none or it is not valid JSON.
 */
export async function readInertiaPageData<T>(
  page: Page,
): Promise<T | undefined> {
  const payload = await page.evaluate(() => {
    const parse = (raw: string | null | undefined) => {
      if (!raw?.trim()) {
        return undefined
      }
      try {
        return JSON.parse(raw) as unknown
      } catch {
        return undefined
      }
    }

    const key = document.querySelector('[data-page]')?.getAttribute('data-page')
    if (key?.trim().startsWith('{')) {
      return parse(key)
    }

    const selector = key
      ? `script[type="application/json"][data-page="${key}"]`
      : 'script[type="application/json"][data-page]'
    return parse(document.querySelector(selector)?.textContent)
  })
  return payload as T | undefined
}
