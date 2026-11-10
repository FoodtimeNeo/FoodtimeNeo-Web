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
import { ensureLatestVersion } from '@/utils/versionRefresh.js';
const app = createApp(App);
setMediaGate(ensureMediaWorkerMigration);
app.use(createPinia());
app.use(router);
setMediaUnauthorizedHandler(() => useAuthStore().clear());
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    ensureLatestVersion();
    useAuthStore()
      .refresh()
      .catch(() => {});
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  ensureLatestVersion();
  if (useAuthStore().isAuthenticated)
    useAuthStore()
      .refresh()
      .catch(() => {});
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
ensureLatestVersion();
app.mount('#app');
