import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach } from 'vitest'

// A wrapper left mounted keeps its watchers alive, so it would still react to
// shared state that a later test changes.
enableAutoUnmount(afterEach)
