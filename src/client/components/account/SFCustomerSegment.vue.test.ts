import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import SFCustomerSegment from './SFCustomerSegment.vue'

// Reference keys of the customer's segments, `undefined` while the customer loads.
const segmentKeys = ref<string[] | undefined>()

vi.mock('@client/composables/useCustomer', () => ({
  useCustomer: () => ({
    isInSegment: (referenceKey: string) =>
      segmentKeys.value?.includes(referenceKey),
  }),
}))

const mountComponent = (renderAllMatching?: boolean) =>
  mount(SFCustomerSegment, {
    props: { renderAllMatching },
    slots: {
      'fifty-plus': '<p>fifty-plus content</p>',
      vip: '<p>vip content</p>',
      default: '<p>default content</p>',
    },
  })

const renderedTexts = (wrapper: VueWrapper) =>
  wrapper.findAll('p').map((paragraph) => paragraph.text())

describe('SFCustomerSegment', () => {
  it.for([
    ['the customer prop resolves', undefined, false, ['default content']],
    [
      'the customer is in none of the segments',
      ['other'],
      false,
      ['default content'],
    ],
    ['the customer is in one segment', ['vip'], false, ['vip content']],
    [
      'the customer is in several segments, first declared only',
      ['vip', 'fifty-plus'],
      false,
      ['fifty-plus content'],
    ],
    [
      'the customer is in several segments, all matching in declaration order',
      ['vip', 'fifty-plus'],
      true,
      ['fifty-plus content', 'vip content'],
    ],
    [
      'the customer is in none of the segments, all matching',
      ['other'],
      true,
      ['default content'],
    ],
  ] as const)(
    'renders the matching slots when %s',
    ([, keys, renderAllMatching, expectedTexts]) => {
      segmentKeys.value = keys ? [...keys] : undefined

      expect(renderedTexts(mountComponent(renderAllMatching))).toEqual(
        expectedTexts,
      )
    },
  )

  it('ranks a conditional slot after the static slots', () => {
    segmentKeys.value = ['vip', 'fifty-plus']

    const wrapper = mount({
      components: { SFCustomerSegment },
      setup: () => ({ showsVip: true }),
      template: `<SFCustomerSegment>
          <template v-if="showsVip" #vip><p>vip content</p></template>
          <template #fifty-plus><p>fifty-plus content</p></template>
          <p>default content</p>
        </SFCustomerSegment>`,
    })

    expect(renderedTexts(wrapper)).toEqual(['fifty-plus content'])
  })

  it('switches to the segment slot once the customer arrives', async () => {
    segmentKeys.value = undefined
    const wrapper = mountComponent()

    segmentKeys.value = ['vip']
    await wrapper.vm.$nextTick()

    expect(renderedTexts(wrapper)).toEqual(['vip content'])
  })
})
