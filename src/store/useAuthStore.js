import { defineStore } from 'pinia';
import { clearSession } from '@/utils/authSession.js';
import { ApiError, invalidateSession } from '@/api/http.js';
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  fetchCurrentUser,
} from '@/api/auth.api.js';
const pendingRefresh = new WeakMap();
function normalizeUser(user) {
  if (!user?.id || !['user', 'admin', 'superadmin'].includes(user.role))
    throw new ApiError('用户响应不符合接口约定', { code: 'PROTOCOL' });
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || '用户',
    role: user.role,
    avatarUrl: user.avatarUrl || null,
  };
}
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, initialized: false, revision: 0 }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    role: (state) => state.user?.role || 'guest',
    isAdmin: (state) => ['admin', 'superadmin'].includes(state.user?.role),
    isSuperadmin: (state) => state.user?.role === 'superadmin',
    displayName: (state) => state.user?.displayName || '用户',
  },
  actions: {
    setSession({ user }) {
      this.user = normalizeUser(user);
      this.initialized = true;
      this.revision += 1;
    },
    clear() {
      this.user = null;
      this.initialized = true;
      this.revision += 1;
      clearSession();
    },
    async refresh() {
      clearSession();
      if (!pendingRefresh.has(this)) {
        const revision = this.revision;
        const task = fetchCurrentUser()
          .then((user) => {
            if (revision === this.revision) this.setSession({ user });
            return this.user;
          })
          .catch((error) => {
            if (revision !== this.revision) return this.user;
            this.user = null;
            if (error.status === 401) {
              invalidateSession();
              return null;
            }
            throw error;
          })
          .finally(() => {
            this.initialized = true;
            pendingRefresh.delete(this);
          });
        pendingRefresh.set(this, task);
      }
      return pendingRefresh.get(this);
    },
    async login(params) {
      this.revision += 1;
      const data = await loginApi(params);
      this.setSession({ user: data.user });
      return this.user;
    },
    async register(params) {
      return registerApi(params);
    },
    async logout() {
      try {
        await logoutApi();
      } catch (error) {
        if (error.status !== 401) throw error;
        invalidateSession();
      }
      this.clear();
    },
  },
});
