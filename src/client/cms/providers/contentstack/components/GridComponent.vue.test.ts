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
import type { GridComponent as GridComponentType } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import GridComponent from './GridComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

const grid = (fields: Record<string, unknown> = {}) =>
  ({
    uid: 'grid-1',
    _content_type_uid: 'grid-component',
    title: 'Grid',
    ...fields,
  }) as unknown as GridComponentType

const cell = (uid: string) => ({
  uid,
  _content_type_uid: 'text-component',
  title: 'Text',
  content: 'Cell',
})

const mountGrid = (
  contentElement: GridComponentType,
  stubs: Record<string, Component | boolean> = {
    ContentstackBlockDispatch: true,
  },
) =>
  mount(GridComponent, {
    props: { contentElement },
    global: { directives: cmsDirectives, stubs },
  })

describe('Contentstack GridComponent', () => {
  // The class mapping and column-count edge cases are tested once in
  // `shared/alignment.test.ts`. These tests prove the grid passes its own
  // fields to the shared resolvers.
  it('maps the authored desktop and mobile column counts to grid classes', () => {
    const classes = mountGrid(
      grid({
        desktop: { number_of_columns_desktop: 4 },
        mobile: { number_of_columns_mobile: 2 },
      }),
    ).classes()

    expect(classes).toContain(resolveDesktopColumnsClass(4))
    expect(classes).toContain(resolveMobileColumnsClass(2))
  })

  it('falls back to two desktop and one mobile column when the groups are absent', () => {
    // Both the `desktop` and `mobile` field groups are optional in the content
    // model, so a grid saved before they were filled in arrives without them.
    const classes = mountGrid(grid()).classes()

    expect(classes).toContain(resolveDesktopColumnsClass(2))
    expect(classes).toContain(resolveMobileColumnsClass(1))
  })

  it('resolves gap classes per axis and breakpoint', () => {
    const classes = mountGrid(
      grid({
        desktop: {
          number_of_columns_desktop: 2,
          gap_column_desktop: 'small',
          gap_row_desktop: 'large',
        },
        mobile: {
          number_of_columns_mobile: 1,
          gap_column_mobile: 'medium',
          gap_row_mobile: 'small',
        },
      }),
    ).classes()

    expect(classes).toEqual(
      expect.arrayContaining([
        resolveGapClass('small', 'column', 'desktop'),
        resolveGapClass('large', 'row', 'desktop'),
        resolveGapClass('medium', 'column', 'mobile'),
        resolveGapClass('small', 'row', 'mobile'),
      ]),
    )
  })

  it('resolves the unset gap for every axis when the gap fields are null', () => {
    // Contentstack returns `null` rather than omitting an unset optional field,
    // which the component normalizes to `undefined` before resolving the class.
    const classes = mountGrid(
      grid({
        desktop: {
          number_of_columns_desktop: 2,
          gap_column_desktop: null,
          gap_row_desktop: null,
        },
        mobile: {
          number_of_columns_mobile: 1,
          gap_column_mobile: null,
          gap_row_mobile: null,
        },
      }),
    ).classes()

    expect(classes).toEqual(
      expect.arrayContaining([
        resolveGapClass(undefined, 'column', 'desktop'),
        resolveGapClass(undefined, 'row', 'desktop'),
        resolveGapClass(undefined, 'column', 'mobile'),
        resolveGapClass(undefined, 'row', 'mobile'),
      ]),
    )
  })

  it('resolves cell alignment, using grid justification for the horizontal axis', () => {
    const classes = mountGrid(
      grid({
        vertical_content_alignment: 'Top',
        // Field id as authored in the content model, missing its trailing "t".
        horizontal_content_alignmen: 'Right',
      }),
    ).classes()

    expect(classes).toContain(resolveVerticalAlignmentClass('Top'))
    expect(classes).toContain(resolveGridAlignmentClass('Right'))
  })

  it('resolves the unset alignment on both axes when the alignment fields are null', () => {
    const classes = mountGrid(
      grid({
        vertical_content_alignment: null,
        horizontal_content_alignmen: null,
      }),
    ).classes()

    expect(classes).toContain(resolveVerticalAlignmentClass())
    expect(classes).toContain(resolveGridAlignmentClass())
  })

  it('divides the inherited viewport fraction by the column count for nested blocks', () => {
    const probe = mountGrid(
      grid({
        desktop: { number_of_columns_desktop: 4 },
        mobile: { number_of_columns_mobile: 2 },
        content: [cell('cell-1')],
      }),
      { ContentstackBlockDispatch: CMSViewportProbe },
    ).get('[data-testid="probe"]')

    // The grid is the outermost container here, so it inherits a full viewport.
    expect(probe.attributes('data-desktop')).toBe('0.25')
    expect(probe.attributes('data-mobile')).toBe('0.5')
  })

  it('renders one block per content entry', () => {
    const wrapper = mountGrid(
      grid({ content: [cell('cell-1'), cell('cell-2')] }),
      { ContentstackBlockDispatch: CMSViewportProbe },
    )

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(2)
  })

  it('renders an empty grid when no content is authored', () => {
    const wrapper = mountGrid(grid(), {
      ContentstackBlockDispatch: CMSViewportProbe,
    })

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(0)
  })

  it('annotates the grid with the live-preview attribute of its content field', () => {
    const wrapper = mountGrid(
      grid({
        $: { content: { 'data-cslp': 'grid-component.grid-1.content' } },
      }),
    )

    expect(wrapper.attributes('data-cslp')).toBe(
      'grid-component.grid-1.content',
    )
  })
})
