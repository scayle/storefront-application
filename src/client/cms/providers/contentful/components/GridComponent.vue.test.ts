import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { describe, expect, it } from 'vitest'
import { CMSViewportProbe } from '@test/stubs/cms'
import {
  resolveDesktopColumnsClass,
  resolveGapClass,
  resolveGridAlignmentClass,
  resolveMobileColumnsClass,
  resolveVerticalAlignmentClass,
} from '@client/cms/shared/alignment'
import type { TypeGridComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import GridComponent from './GridComponent.vue'

const grid = (fields: Record<string, unknown> = {}) =>
  ({
    sys: { id: 'grid-1' },
    fields,
  }) as unknown as TypeGridComponentWithoutUnresolvableLinksResponse

const mountGrid = (
  contentElement: TypeGridComponentWithoutUnresolvableLinksResponse,
  stubs: Record<string, Component | boolean> = {
    ContentfulBlockDispatch: true,
  },
) => mount(GridComponent, { props: { contentElement }, global: { stubs } })

describe('Contentful GridComponent', () => {
  // The class maps and their edge cases are tested in shared/alignment.test.ts.
  // These tests prove only that each Contentful field reaches its resolver.
  it('passes the authored column counts to the column class resolvers', () => {
    const classes = mountGrid(
      grid({ numberOfColumnsDesktop: 4, numberOfColumnsMobile: 3 }),
    ).classes()

    expect(classes).toContain(resolveDesktopColumnsClass(4))
    expect(classes).toContain(resolveMobileColumnsClass(3))
  })

  it('falls back to two desktop and one mobile column when the counts are unset', () => {
    const classes = mountGrid(grid()).classes()

    expect(classes).toContain(resolveDesktopColumnsClass(2))
    expect(classes).toContain(resolveMobileColumnsClass(1))
  })

  it('passes each gap field to the resolver for its axis and breakpoint', () => {
    const classes = mountGrid(
      grid({
        gapColumnDesktop: 'small',
        gapColumnMobile: 'medium',
        gapRowDesktop: 'large',
        gapRowMobile: 'small',
      }),
    ).classes()

    expect(classes).toEqual(
      expect.arrayContaining([
        resolveGapClass('small', 'column', 'desktop'),
        resolveGapClass('medium', 'column', 'mobile'),
        resolveGapClass('large', 'row', 'desktop'),
        resolveGapClass('small', 'row', 'mobile'),
      ]),
    )
  })

  it('passes the horizontal alignment to the grid justification resolver', () => {
    const classes = mountGrid(
      grid({
        verticalContentAlignment: 'Top',
        horizontalContentAlignment: 'Right',
      }),
    ).classes()

    expect(classes).toContain(resolveVerticalAlignmentClass('Top'))
    expect(classes).toContain(resolveGridAlignmentClass('Right'))
  })

  it('divides the inherited viewport fraction by the column count for nested blocks', () => {
    const probe = mountGrid(
      grid({
        numberOfColumnsDesktop: 4,
        numberOfColumnsMobile: 2,
        columnContent: [{ sys: { id: 'cell-1' } }],
      }),
      { ContentfulBlockDispatch: CMSViewportProbe },
    ).get('[data-testid="probe"]')

    // The grid is the outermost container here, so it inherits a full viewport.
    expect(probe.attributes('data-desktop')).toBe('0.25')
    expect(probe.attributes('data-mobile')).toBe('0.5')
  })

  it('renders one block per column content entry', () => {
    const wrapper = mountGrid(
      grid({
        columnContent: [{ sys: { id: 'cell-1' } }, { sys: { id: 'cell-2' } }],
      }),
      { ContentfulBlockDispatch: CMSViewportProbe },
    )

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(2)
  })

  it('renders an empty grid when no column content is authored', () => {
    const wrapper = mountGrid(grid(), {
      ContentfulBlockDispatch: CMSViewportProbe,
    })

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(0)
  })

  it('annotates the entry so the Contentful editor can highlight the field', () => {
    const wrapper = mountGrid(grid())

    expect(wrapper.attributes('data-contentful-entry-id')).toBe('grid-1')
    expect(wrapper.attributes('data-contentful-field-id')).toBe('columnContent')
  })
})
