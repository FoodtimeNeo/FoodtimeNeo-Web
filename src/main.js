import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ElMessage } from 'element-plus';
import 'element-plus/dist/index.css';
import App from '@/App.vue';
import router from '@/router/index.js';
import { installApi, http } from '@/api/index.js';
import '@/assets/styles/global.scss';

const app = createApp(App);

app.use(createPinia());
app.use(router);
installApi({ router, notifyForbidden: (message) => ElMessage.error(message) });

/**
 * Mock 模式（npm run dev:mock）下先替换请求传输层再挂载，保证首屏请求也走 mock。
 * 动态导入使 mock 代码不进入正常构建的首包。
 */
async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { installMock } = await import('@/mock/index.js');
    installMock(http);
  }
  app.mount('#app');
}

bootstrap();
