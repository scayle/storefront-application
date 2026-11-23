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
import type { GridComponent as GridComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import GridComponent from './GridComponent.vue'

const cmsDirectives = { editable: vEditable }

const grid = (fields: Record<string, unknown> = {}) =>
  ({
    _uid: 'grid-1',
    component: 'GridComponent',
    ...fields,
  }) as unknown as GridComponentType

const cell = (uid: string) => ({
  _uid: uid,
  component: 'TextComponent',
  content: 'Cell',
})

const mountGrid = (
  contentElement: GridComponentType,
  stubs: Record<string, Component | boolean> = { StoryblokBlockDispatch: true },
) =>
  mount(GridComponent, {
    props: { contentElement },
    global: { directives: cmsDirectives, stubs },
  })

describe('Storyblok GridComponent', () => {
  it('passes the authored desktop and mobile column counts to the column classes', () => {
    // Storyblok delivers both counts as strings.
    const classes = mountGrid(
      grid({ numberOfColumnsDesktop: '4', numberOfColumnsMobile: '2' }),
    ).classes()

    expect(classes).toContain(resolveDesktopColumnsClass(4))
    expect(classes).toContain(resolveMobileColumnsClass(2))
  })

  it('falls back to two desktop and one mobile column when the counts are unset', () => {
    const classes = mountGrid(grid()).classes()

    expect(classes).toContain(resolveDesktopColumnsClass(2))
    expect(classes).toContain(resolveMobileColumnsClass(1))
  })

  it.for([
    { field: 'gapColumnDesktop', axis: 'column', breakpoint: 'desktop' },
    { field: 'gapColumnMobile', axis: 'column', breakpoint: 'mobile' },
    { field: 'gapRowDesktop', axis: 'row', breakpoint: 'desktop' },
    { field: 'gapRowMobile', axis: 'row', breakpoint: 'mobile' },
  ] as const)(
    'passes $field to the $axis gap on $breakpoint',
    ({ field, axis, breakpoint }) => {
      const classes = mountGrid(grid({ [field]: 'large' })).classes()

      expect(classes).toContain(resolveGapClass('large', axis, breakpoint))
    },
  )

  it('emits no gap class for the empty option the gap selects offer', () => {
    // `resolveGapClass` short-circuits on the falsy `''` before its nullish
    // default applies, so it returns `''` rather than the `gap-*-0` default.
    // Both render a zero gap, since a grid without a gap class has none.
    const classes = mountGrid(
      grid({
        gapColumnDesktop: '',
        gapColumnMobile: '',
        gapRowDesktop: '',
        gapRowMobile: '',
      }),
    ).classes()

    expect(classes.filter((name) => name.includes('gap-'))).toEqual([])
  })

  it('passes the vertical and horizontal alignment to the grid alignment classes', () => {
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
        numberOfColumnsDesktop: '4',
        numberOfColumnsMobile: '2',
        columnContent: [cell('cell-1')],
      }),
      { StoryblokBlockDispatch: CMSViewportProbe },
    ).get('[data-testid="probe"]')

    // The grid is the outermost container here, so it inherits a full viewport.
    expect(probe.attributes('data-desktop')).toBe('0.25')
    expect(probe.attributes('data-mobile')).toBe('0.5')
  })

  it('propagates the fallback column count, not the unusable authored one', () => {
    const probe = mountGrid(
      grid({
        numberOfColumnsDesktop: 'wide',
        numberOfColumnsMobile: '0',
        columnContent: [cell('cell-1')],
      }),
      { StoryblokBlockDispatch: CMSViewportProbe },
    ).get('[data-testid="probe"]')

    // Reading the raw value here would divide by NaN and by zero, sending
    // `NaN` and `Infinity` into every nested image's `sizes`.
    expect(probe.attributes('data-desktop')).toBe('0.5')
    expect(probe.attributes('data-mobile')).toBe('1')
  })

  it('renders one block per column content entry', () => {
    const wrapper = mountGrid(
      grid({ columnContent: [cell('cell-1'), cell('cell-2')] }),
      { StoryblokBlockDispatch: CMSViewportProbe },
    )

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(2)
  })

  it('renders an empty grid when no column content is authored', () => {
    const wrapper = mountGrid(grid(), {
      StoryblokBlockDispatch: CMSViewportProbe,
    })

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(0)
  })
})
