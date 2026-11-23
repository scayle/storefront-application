import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFProgressBar from './SFProgressBar.vue'

const COLOR = '#ff0000'
const WHITE = 'var(--color-white)'

const milestones = [
  { percent: 0.25, title: 'a', subtitle: 'a1' },
  { percent: 0.5, title: 'b', subtitle: 'b1' },
  { percent: 1, title: 'c', subtitle: 'c1' },
]

const mountBar = (progress: number, ms = milestones) =>
  mount(SFProgressBar, { props: { progress, color: COLOR, milestones: ms } })

/** Milestones, found by the inline position the component computes for each one. */
const findMilestones = (wrapper: ReturnType<typeof mountBar>) =>
  wrapper
    .findAll<HTMLElement>('div')
    .filter((element) => element.element.style.left !== '')

/** Background of each milestone marker, in order. */
const markerFills = (wrapper: ReturnType<typeof mountBar>) =>
  findMilestones(wrapper).map(
    (milestone) =>
      milestone.get<HTMLElement>('[style*="background"]').element.style
        .background,
  )

describe('SFProgressBar', () => {
  it('names the native progress element with the given accessible name', () => {
    const wrapper = mount(SFProgressBar, {
      props: { progress: 10, ariaLabel: 'Spend 20 more to unlock the deal' },
    })
    expect(wrapper.get('progress').attributes('aria-label')).toBe(
      'Spend 20 more to unlock the deal',
    )
  })

  it('renders no milestones when none are given', () => {
    const wrapper = mount(SFProgressBar, { props: { progress: 10 } })
    expect(findMilestones(wrapper)).toHaveLength(0)
  })

  // A milestone counts as reached from progress >= percent * 100, the exact
  // boundary included.
  it.for([
    { progress: 24.99, fills: [WHITE, WHITE, WHITE] },
    { progress: 25, fills: [COLOR, WHITE, WHITE] },
    { progress: 50, fills: [COLOR, COLOR, WHITE] },
    { progress: 99.9, fills: [COLOR, COLOR, WHITE] },
    { progress: 100, fills: [COLOR, COLOR, COLOR] },
  ])(
    'fills the reached milestones at progress $progress',
    ({ progress, fills }) => {
      expect(markerFills(mountBar(progress))).toEqual(fills)
    },
  )

  it('offsets the last milestone by its full width and the others by half', () => {
    const wrapper = mountBar(0)
    const lefts = findMilestones(wrapper).map(
      (milestone) => milestone.element.style.left,
    )

    expect(lefts).toEqual([
      'calc(25% - 28px)',
      'calc(50% - 28px)',
      'calc(100% - 56px)',
    ])
  })

  it('treats a single milestone as the last one', () => {
    const wrapper = mountBar(0, [{ percent: 0.5, title: 'x', subtitle: 'y' }])
    const [marker] = findMilestones(wrapper)
    expect(marker!.element.style.left).toBe('calc(50% - 56px)')
  })
})
