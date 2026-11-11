import { defineStore } from 'pinia';
import { allowMediaSession, invalidateMedia } from '@/utils/mediaLoader.js';
import { clearSession } from '@/utils/authSession.js';
import { clearVenueDrafts } from '@/utils/venueDrafts.js';
import { useUserSearchStore } from '@/store/useUserSearchStore.js';
import { clearAsyncDataCache } from '@/composables/useAsyncData.js';
import { ApiError, invalidateSession } from '@/api/http.js';
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  fetchCurrentUser,
} from '@/api/auth.api.js';
import { fetchCapabilities } from '@/api/capabilities.api.js';
const pendingRefresh = new WeakMap();
function normalizeUser(user) {
  if (
    !user?.id ||
    !['visitor', 'user', 'admin', 'superadmin'].includes(user.role)
  )
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
  state: () => ({
    user: null,
    initialized: false,
    revision: 0,
    capabilities: [],
    capabilityRevision: '',
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    role: (state) => state.user?.role || 'guest',
    isAdmin: (state) => ['admin', 'superadmin'].includes(state.user?.role),
    isSuperadmin: (state) => state.user?.role === 'superadmin',
    displayName: (state) => state.user?.displayName || '用户',
    can: (state) => (capability) => state.capabilities.includes(capability),
  },
  actions: {
    setSession({ user }) {
      if (this.user?.id !== user?.id || this.user?.role !== user?.role) {
        useUserSearchStore().clear();
        clearAsyncDataCache();
        allowMediaSession();
        invalidateMedia();
        this.capabilities = [];
        this.capabilityRevision = '';
      }
      this.user = normalizeUser(user);
      this.initialized = true;
      this.revision += 1;
    },
    clear() {
      useUserSearchStore().clear();
      clearAsyncDataCache();
      clearVenueDrafts();
      invalidateMedia();
      this.user = null;
      this.capabilities = [];
      this.capabilityRevision = '';
      this.initialized = true;
      this.revision += 1;
      clearSession();
    },
    /** 只消费服务器能力；失败时保持空能力，不按角色自行推断。 */
    async refreshCapabilities() {
      const userId = this.user?.id;
      if (!userId) {
        this.capabilities = [];
        this.capabilityRevision = '';
        return [];
      }
      const data = await fetchCapabilities();
      if (this.user?.id !== userId) return this.capabilities;
      this.capabilities = data.capabilities;
      this.capabilityRevision = data.revision;
      return this.capabilities;
    },
    async refresh() {
      clearSession();
      if (!pendingRefresh.has(this)) {
        const revision = this.revision;
        const task = fetchCurrentUser()
          .then(async (user) => {
            if (revision === this.revision) {
              this.setSession({ user });
              await this.refreshCapabilities().catch(() => {});
            }
            return this.user;
          })
          .catch((error) => {
            if (revision !== this.revision) return this.user;
            if (error.status === 401) {
              this.clear();
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
      invalidateMedia();
      this.revision += 1;
      const data = await loginApi(params);
      this.setSession({ user: data.user });
      await this.refreshCapabilities().catch(() => {});
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
