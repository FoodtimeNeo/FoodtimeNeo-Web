import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ElMessage } from 'element-plus';
import 'element-plus/dist/index.css';
import App from '@/App.vue';
import router from '@/router/index.js';
import { installApi } from '@/api/index.js';
import '@/assets/styles/global.scss';

const app = createApp(App);

app.use(createPinia());
app.use(router);
installApi({ router, notifyForbidden: (message) => ElMessage.error(message) });

app.mount('#app');
