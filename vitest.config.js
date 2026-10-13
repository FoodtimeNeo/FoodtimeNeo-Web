import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { alias } from './vite.config.js';

export default defineConfig({
  plugins: [vue()],
  resolve: { alias },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.js', 'scripts/**/*.spec.js'],
  },
});
