import { describe, it, expect } from 'vitest'
import { PageTypeSnakeCase } from './Tracking'

const SNAKE_CASE = /^[a-z]+(_[a-z]+)*$/
const VUE_EXTENSION = /\.vue$/

describe('PageTypeSnakeCase', () => {
  it('maps every page type to a snake_case value', () => {
    for (const pageType of Object.values(PageTypeSnakeCase)) {
      expect(pageType).toMatch(SNAKE_CASE)
    }
  })

  // Runtime counterpart to the `satisfies` constraint: catches an unmapped
  // page even in a setup where typechecking does not run in CI. The glob
  // mirrors the page resolver in client/ssr.ts and client/main.ts.
  it('has a page_type mapping for every page component', () => {
    const pageFiles = Object.keys(
      import.meta.glob('../../client/pages/**/*.vue'),
    )
    expect(pageFiles.length).toBeGreaterThan(0)
    for (const pageFile of pageFiles) {
      const componentName = pageFile
        .replace('../../client/pages/', '')
        .replace(VUE_EXTENSION, '')
      expect(PageTypeSnakeCase).toHaveProperty(componentName)
    }
  })
})
