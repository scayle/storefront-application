import { afterEach, describe, expect, it } from 'vitest'
import { getFirstFocusable, getFirstFocusableAfter } from './focus'

// happy-dom does not compute layout, so `offsetParent` is truthy even for
// elements it never lays out. Force it so the visibility check inside
// `getFirstFocusableAfter` behaves like a real browser.
const markVisible = (el: HTMLElement) => {
  Object.defineProperty(el, 'offsetParent', {
    configurable: true,
    value: document.body,
  })
  return el
}

const markHidden = (el: HTMLElement) => {
  Object.defineProperty(el, 'offsetParent', {
    configurable: true,
    value: null,
  })
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('getFirstFocusable', () => {
  it('returns the first focusable descendant', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <span tabindex="-1">sentinel</span>
      <button>first</button>
      <a href="#">second</a>
    `

    expect(getFirstFocusable(container)?.textContent).toBe('first')
  })

  it('skips disabled controls', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <button disabled>disabled</button>
      <a href="#">link</a>
    `

    expect(getFirstFocusable(container)?.tagName).toBe('A')
  })

  it('returns null for a missing container or when none exist', () => {
    const empty = document.createElement('div')
    empty.innerHTML = '<span tabindex="-1">only sentinel</span>'

    expect(getFirstFocusable(null)).toBeNull()
    expect(getFirstFocusable(undefined)).toBeNull()
    expect(getFirstFocusable(empty)).toBeNull()
  })
})

describe('getFirstFocusableAfter', () => {
  it('returns the first visible focusable following and outside the region', () => {
    const region = document.createElement('div')
    region.innerHTML = '<button>inside</button>'
    const after = markVisible(document.createElement('button'))
    after.textContent = 'after'

    document.body.append(region, after)

    expect(getFirstFocusableAfter(region)).toBe(after)
  })

  it('returns the first in document order when several follow', () => {
    const region = document.createElement('div')
    const first = markVisible(document.createElement('button'))
    first.textContent = 'first'
    const second = markVisible(document.createElement('button'))
    second.textContent = 'second'

    document.body.append(region, first, second)

    expect(getFirstFocusableAfter(region)).toBe(first)
  })

  it('ignores focusables inside the region', () => {
    const region = document.createElement('div')
    const inside = markVisible(document.createElement('button'))
    inside.textContent = 'inside'
    region.append(inside)

    document.body.append(region)

    expect(getFirstFocusableAfter(region)).toBeNull()
  })

  it('skips invisible candidates', () => {
    const region = document.createElement('div')
    const hidden = markHidden(document.createElement('button'))
    hidden.textContent = 'hidden'

    document.body.append(region, hidden)

    expect(getFirstFocusableAfter(region)).toBeNull()
  })

  it('returns null when the region is missing', () => {
    expect(getFirstFocusableAfter(null)).toBeNull()
    expect(getFirstFocusableAfter(undefined)).toBeNull()
  })

  // `showModal()` makes everything outside the dialog inert, so a match out
  // there cannot take focus. The slide-in hosts a product slider whose
  // "skip to end" control is the last content in the dialog.
  it('does not leave the enclosing dialog', () => {
    const dialog = document.createElement('dialog')
    const region = document.createElement('div')
    dialog.append(region)
    const outside = markVisible(document.createElement('button'))
    outside.textContent = 'outside'

    document.body.append(dialog, outside)

    expect(getFirstFocusableAfter(region)).toBeNull()
  })

  it('returns a following focusable inside the same dialog', () => {
    const dialog = document.createElement('dialog')
    const region = document.createElement('div')
    const sibling = markVisible(document.createElement('button'))
    sibling.textContent = 'sibling'
    dialog.append(region, sibling)

    document.body.append(dialog, markVisible(document.createElement('button')))

    expect(getFirstFocusableAfter(region)).toBe(sibling)
  })
})
