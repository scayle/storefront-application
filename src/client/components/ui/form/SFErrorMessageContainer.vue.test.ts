import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFErrorMessageContainer from './SFErrorMessageContainer.vue'

const SFFadeInTransition = {
  template: '<div><slot /></div>',
}

const mountComponent = (props: { message: string | null | undefined }) =>
  mount(SFErrorMessageContainer, {
    props,
    global: {
      stubs: {
        SFFadeInTransition,
      },
    },
  })

describe('SFErrorMessageContainer', () => {
  it('announces the message as an alert when provided', () => {
    const wrapper = mountComponent({ message: 'Something went wrong' })

    expect(wrapper.get('[role="alert"]').text()).toBe('Something went wrong')
  })

  it.for([{ message: null }, { message: undefined }])(
    'renders no alert when the message is $message',
    ({ message }) => {
      const wrapper = mountComponent({ message })

      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    },
  )
})
