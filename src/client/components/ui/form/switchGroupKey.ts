import type { InjectionKey, Ref } from 'vue'

/**
 * Injection key used by `SFSwitchGroup` to broadcast a group-level disabled
 * state down to descendant `SFSwitch` / `SFSwitchBase` controls. When the
 * group is disabled, every child switch behaves as disabled regardless of
 * its own `disabled` prop.
 */
export const SFSwitchGroupDisabledKey: InjectionKey<Ref<boolean>> = Symbol(
  'SFSwitchGroupDisabled',
)
