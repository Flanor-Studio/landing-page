import { defineConfig } from 'astro/config';

const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const pagesUrl = process.env.PAGES_ORIGIN || 'https://flanorstudio.ir';

export default defineConfig({
  output: 'static',
  site: pagesUrl || (githubHost ? `https://${githubHost}` : undefined),
  base: process.env.PAGES_BASE || '/',
  build: { format: 'directory' },
  vite: {
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [{ name: 'three-core', test: /\/three\/build\/three\.core\.js$/ }],
          },
        },
      },
    },
  },
  devToolbar: { enabled: false },
});
