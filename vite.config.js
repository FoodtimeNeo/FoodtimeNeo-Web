import http from 'node:http';
import https from 'node:https';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { developmentProxyTarget } from './scripts/dev/proxy-target.js';
import { productionCsp } from './scripts/security/policy.js';

function createProxyAgent(target) {
  const isHttps = target.startsWith('https:');
  const AgentClass = isHttps ? https.Agent : http.Agent;
  return new AgentClass({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    rejectUnauthorized: true,
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  let proxyTarget = developmentProxyTarget(env.VITE_API_PROXY_TARGET);
  if (proxyTarget === 'http://154.9.252.201') {
    proxyTarget = 'https://154.9.252.201';
  }

  return {
    plugins: [vue(), productionCsp()],
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
          secure: true,
          agent: createProxyAgent(proxyTarget),
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const sc = proxyRes.headers['set-cookie'];
              if (sc) {
                proxyRes.headers['set-cookie'] = sc.map((c) =>
                  c.replace(/;\s*Secure/gi, ''),
                );
              }
            });
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.spec.js', 'scripts/**/*.spec.js'],
    },
  };
});
