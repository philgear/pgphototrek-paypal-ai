// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const repoBase = process.env.BASE_PATH || (isGitHubActions ? '/pgphototrek-paypal-ai' : '/');

export default defineConfig({
  site: 'https://philgear.github.io',
  base: repoBase,
  output: 'static',
  trailingSlash: 'ignore',
  vite: {
    plugins: [tailwindcss()],
  },
});
