import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ElMessage } from 'element-plus';
import 'element-plus/dist/index.css';
import App from '@/App.vue';
import router from '@/router/index.js';
import { installApi } from '@/api/index.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import '@/assets/styles/global.scss';
const app = createApp(App);
app.use(createPinia());
app.use(router);
installApi({
  router,
  clearAuth: () => useAuthStore().clear(),
  notifyForbidden: (message) => ElMessage.error(message),
});
router.onError((error) =>
  ElMessage.error(error.message || '无法验证登录状态，请稍后重试'),
);
app.mount('#app');
