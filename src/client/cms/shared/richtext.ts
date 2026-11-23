import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes raw CMS rich text HTML before rendering.
 * Works on both server (SSR) and client using isomorphic-dompurify.
 *
 * @param html Raw HTML string from a CMS
 * @returns Sanitized HTML safe for rendering
 */
export const sanitizeCmsHtml = (html: string): string => {
  return DOMPurify.sanitize(html)
}
