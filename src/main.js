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
import {
  ensureLatestVersion,
  startVersionUpdates,
  restoreUpdatePosition,
} from '@/utils/versionRefresh.js';
import { installPageEditGuard } from '@/utils/updateSafety.js';
import { setApiFailureHandler } from '@/api/http.js';
import { installAppearance } from '@/composables/useAppearance.js';
installAppearance();
const app = createApp(App);
installPageEditGuard();
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
router.onError((error) => {
  void ensureLatestVersion({ force: true });
  ElMessage.error({
    message: error.message || '无法验证登录状态，请稍后重试',
    grouping: true,
  });
});
setApiFailureHandler(() => {
  void ensureLatestVersion({ force: true });
});
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', invalidateMedia);
}
app.mount('#app');
startVersionUpdates();
router
  .isReady()
  .then(restoreUpdatePosition)
  .catch(() => {});
