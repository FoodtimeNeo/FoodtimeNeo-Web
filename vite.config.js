import http from 'node:http';
import https from 'node:https';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { developmentProxyTarget } from './scripts/dev/proxy-target.js';

function createProxyAgent(target) {
  const isHttps = target.startsWith('https:');
  const AgentClass = isHttps ? https.Agent : http.Agent;
  return new AgentClass({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = developmentProxyTarget(env.VITE_API_PROXY_TARGET);

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
          target: proxyTarget,
          changeOrigin: true,
          agent: createProxyAgent(proxyTarget),
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.spec.js', 'scripts/**/*.spec.js'],
    },
  };
});
