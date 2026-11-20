import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes.js';
import { installGuards } from './guards.js';

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition || { top: 0 },
});

installGuards(router);

export default router;
