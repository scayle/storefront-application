import { defineConfig } from 'vitest/config'

export default defineConfig(() => {
  return {
    test: {
      name: 'cache',
      include: ['**/cache.test.ts'],
      environment: 'node',
      env: {
        NODE_OPTIONS: '--use-system-ca',
      },
    },
  }
})
