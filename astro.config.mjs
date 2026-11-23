import { defineConfig } from 'astro/config';

const pagesUrl = process.env.PAGES_ORIGIN || 'https://flanorstudio.ir';

export default defineConfig({
  output: 'static',
  site: pagesUrl,
  base: process.env.PAGES_BASE || '/',
  build: { format: 'directory', inlineStylesheets: 'always' },
  vite: {
    // Use the source modules so the renderer and shader data can download separately.
    resolve: { alias: [{ find: /^three$/, replacement: 'three/src/Three.js' }] },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'three-curves', test: /\/three\/src\/extras\/curves\/CatmullRomCurve3\.js$/ },
              { name: 'three-shaders', test: /\/three\/src\/renderers\/shaders\/.*\.glsl\.js$/ },
              { name: 'three-core', test: /\/three\/src\/(?!renderers\/|Three\.)/ },
              { name: 'three-renderer', test: /\/three\/src\/renderers\// },
            ],
          },
        },
      },
    },
  },
  devToolbar: { enabled: false },
});
