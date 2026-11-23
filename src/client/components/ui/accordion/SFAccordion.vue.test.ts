import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SFAccordion from './SFAccordion.vue'

describe('SFAccordion', () => {
  it('makes the title row at least 48px high so it is easy to hit', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title' },
    })
    // On the row rather than the summary, so the padding the summary takes
    // over while closed adds to the 48px instead of eating into it.
    const summaryRow = wrapper.find('[data-testid="accordion-summary"] > div')
    expect(summaryRow.classes()).toContain('min-h-12')
  })

  it('stretches the summary over the entry padding while closed', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title' },
    })
    expect(wrapper.find('summary').classes()).toEqual(
      expect.arrayContaining([
        'group-not-open:-my-5',
        'group-not-open:py-5',
        'sm:group-not-open:-my-10',
        'sm:group-not-open:py-10',
      ]),
    )
  })

  it('drops the vertical entry padding for a 64px title row at the md size', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title', size: 'md' },
    })
    const entry = wrapper.find('div')
    expect(entry.classes()).not.toContain('py-5')
    expect(entry.classes()).not.toContain('sm:py-10')

    const summaryRow = wrapper.find('[data-testid="accordion-summary"] > div')
    expect(summaryRow.classes()).toContain('min-h-16')
  })

  it('stretches the closed summary over the horizontal padding only at the md size', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title', size: 'md' },
    })
    const summaryClasses = wrapper.find('summary').classes()
    expect(summaryClasses).toEqual(
      expect.arrayContaining([
        'group-not-open:-mx-2',
        'group-not-open:px-2',
        'sm:group-not-open:-mx-2.5',
        'sm:group-not-open:px-2.5',
      ]),
    )
    expect(summaryClasses).not.toContain('group-not-open:-my-5')
  })

  it('spans the summary across both columns while closed', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title' },
    })
    expect(wrapper.find('summary').classes()).toContain(
      'sm:group-not-open:col-span-2',
    )
  })

  it('sets aria-disabled and prevents click toggle when disabled', async () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title', disabled: true },
    })
    const details = wrapper.find('details').element as HTMLDetailsElement
    expect(details.getAttribute('aria-disabled')).toBe('true')

    const click = new MouseEvent('click', { cancelable: true, bubbles: true })
    wrapper.find('summary').element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(details.open).toBe(false)
  })

  it('opens on a summary click when enabled', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title' },
    })
    const details = wrapper.find('details').element as HTMLDetailsElement

    const click = new MouseEvent('click', { cancelable: true, bubbles: true })
    wrapper.find('summary').element.dispatchEvent(click)

    expect(details.open).toBe(true)
  })

  it('removes the summary from the tab chain when disabled', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title', disabled: true },
    })
    expect(wrapper.find('summary').attributes('tabindex')).toBe('-1')
  })

  // Both attributes were once added on purpose. A native <summary> already
  // reports the disclosure state, so this guards against adding them back.
  it('leaves role and aria-expanded off the summary', () => {
    const wrapper = mount(SFAccordion, {
      props: { id: 'a', title: 'Title' },
    })
    const summary = wrapper.find('summary')
    expect(summary.attributes('role')).toBeUndefined()
    expect(summary.attributes('aria-expanded')).toBeUndefined()
  })
})
