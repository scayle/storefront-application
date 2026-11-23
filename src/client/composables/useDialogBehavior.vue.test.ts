import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useDialogBehavior } from './useDialogBehavior'

/**
 * Mounts a minimal `<dialog>` host that wires up `useDialogBehavior`, so the composable
 * runs inside a real setup/attrs context. Exposes the open ref and handlers.
 */
function mountDialog(
  options: Parameters<typeof useDialogBehavior>[1] = {},
  attrs: Record<string, unknown> = {},
  initialOpen = true,
) {
  const open = ref(initialOpen)

  const Host = defineComponent({
    inheritAttrs: false,
    setup() {
      const dialog = useDialogBehavior(open, options)
      return { open, ...dialog }
    },
    render() {
      return h('dialog', {
        ...this.dialogAttrs,
        onClick: this.onBackdropClick,
        onCancel: this.onCancel,
      })
    },
  })

  const wrapper = mount(Host, { attrs })

  return { wrapper, open }
}

describe('useDialogBehavior', () => {
  it('exposes fallthrough attrs without class', () => {
    const { wrapper } = mountDialog(
      {},
      { id: 'overlay', class: 'consumer-class', 'data-testid': 'dlg' },
    )

    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('id')).toBe('overlay')
    expect(dialog.attributes('data-testid')).toBe('dlg')
    // `class` is stripped so the component owns class merging.
    expect(dialog.attributes('class')).toBeUndefined()
  })

  it('closes and runs onClose when the dialog itself is clicked', async () => {
    const onClose = vi.fn()
    const { wrapper, open } = mountDialog({ onClose })

    await wrapper.find('dialog').trigger('click')

    expect(open.value).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not run onClose when the open ref is flipped directly', async () => {
    const onClose = vi.fn()
    const { wrapper, open } = mountDialog({ onClose })

    open.value = false
    await wrapper.vm.$nextTick()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('ignores backdrop clicks originating from a child element', () => {
    const { wrapper, open } = mountDialog()

    const dialog = wrapper.find('dialog').element
    const child = document.createElement('button')
    dialog.append(child)
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(open.value).toBe(true)
  })

  it('does not close on backdrop click when closeOnBackdropClick is false', async () => {
    const { wrapper, open } = mountDialog({ closeOnBackdropClick: false })

    await wrapper.find('dialog').trigger('click')

    expect(open.value).toBe(true)
  })

  it('reads closeOnBackdropClick through a getter and honours updates', async () => {
    // `SFModal` wires this as a getter (`() => closeOnBackdropClick`), so the
    // getter path — not the boolean literal — is what runs in production.
    let allowClose = false
    const { wrapper, open } = mountDialog({
      closeOnBackdropClick: () => allowClose,
    })

    // Getter returns false: the backdrop click is ignored.
    await wrapper.find('dialog').trigger('click')
    expect(open.value).toBe(true)

    // Flip the getter's source; `toValue` re-reads it on the next click.
    allowClose = true
    await wrapper.find('dialog').trigger('click')
    expect(open.value).toBe(false)
  })

  it('prevents the native cancel default and closes on Escape', async () => {
    const onClose = vi.fn()
    const { wrapper, open } = mountDialog({ onClose })

    const event = new Event('cancel', { cancelable: true })
    wrapper.find('dialog').element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(open.value).toBe(false)
    // Escape runs `close()`, so the `onClose` callback fires just like the
    // backdrop-click path.
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('locks document scroll while open and releases it on close', async () => {
    const { wrapper, open } = mountDialog({}, {}, false)

    open.value = true
    await wrapper.vm.$nextTick()
    expect(document.documentElement.style.overflow).toBe('hidden')

    open.value = false
    await wrapper.vm.$nextTick()
    expect(document.documentElement.style.overflow).not.toBe('hidden')
  })
  it('locks document scroll when mounted with open true', () => {
    const { open } = mountDialog()

    expect(open.value).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')
  })
})
