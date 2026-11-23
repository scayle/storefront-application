/**
 * Default mock of `@client/cms/shared/richtext` for CMS component tests:
 *
 * ```ts
 * vi.mock(import('@client/cms/shared/richtext'), () => import('@test/mocks/richtext'))
 * ```
 */

/**
 * Returns the HTML unchanged instead of running DOMPurify: `isomorphic-dompurify`
 * loads jsdom, which conflicts with happy-dom in component tests. A test asserts
 * the markup a component renders from its CMS data.
 *
 * @param html Rich text HTML from the CMS data.
 * @returns The same HTML.
 */
export function sanitizeCmsHtml(html: string): string {
  return html
}
