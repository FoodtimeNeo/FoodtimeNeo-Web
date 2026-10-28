import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ElMessage } from 'element-plus';
import 'element-plus/dist/index.css';
import App from '@/App.vue';
import router from '@/router/index.js';
import { installApi } from '@/api/index.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import '@/assets/styles/global.scss';
import {
  invalidateMedia,
  setMediaUnauthorizedHandler,
  setMediaGate,
} from '@/utils/mediaLoader.js';
import { ensureMediaWorkerMigration } from '@/utils/mediaWorker.js';
const app = createApp(App);
setMediaGate(ensureMediaWorkerMigration);
app.use(createPinia());
app.use(router);
setMediaUnauthorizedHandler(() => useAuthStore().clear());
router.afterEach(() => invalidateMedia());
window.addEventListener('pagehide', invalidateMedia);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    invalidateMedia();
    useAuthStore().refresh();
  }
});
document.addEventListener('visibilitychange', () => {
  invalidateMedia();
  if (!document.hidden && useAuthStore().isAuthenticated)
    useAuthStore().refresh();
});
installApi({
  router,
  clearAuth: () => useAuthStore().clear(),
  notifyForbidden: (message) => ElMessage.error(message),
});
router.onError((error) =>
  ElMessage.error(error.message || '无法验证登录状态，请稍后重试'),
);
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', invalidateMedia);
}
app.mount('#app');
