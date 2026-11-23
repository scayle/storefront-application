// `vite.config.ts` runs vite-svg-loader with `defaultImport: 'component'`, so a bare
// `.svg` import is a Vue component, while `vite/client` types it as a URL string.
// Referenced from `vite-env.d.ts` before `vite/client` so this declaration wins.
declare module '*.svg' {
  import type { FunctionalComponent, SVGAttributes } from 'vue'

  const component: FunctionalComponent<SVGAttributes>
  export default component
}
