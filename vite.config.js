import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { localProxyTarget } from './scripts/dev/proxy-target.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: 'localhost',
      strictPort: true,
      cors: false,
      proxy: {
        '/api': {
          target: localProxyTarget(env.VITE_API_PROXY_TARGET),
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.spec.js', 'scripts/**/*.spec.js'],
    },
  };
});
