import { defineStore } from 'pinia';
import {
  readSession,
  writeSession,
  clearSession,
} from '@/utils/authSession.js';
import { login as loginApi, register as registerApi } from '@/api/auth.api.js';

/**
 * 规整后端返回的用户对象，统一前端字段。
 * @param {object} payload
 * @returns {{ id: string, account: string, email: string, nickname: string, role: string }}
 */
function normalizeUser(payload) {
  return {
    id: payload.id ?? '',
    account: payload.account ?? '',
    email: payload.email ?? '',
    nickname: payload.nickname || payload.account || '用户',
    role: payload.role ?? 'user',
  };
}

/**
 * 会话状态。token 与用户信息持久化在 localStorage（authSession），刷新后恢复。
 * 跨页面共享：登录态、角色、显示名、路由守卫判断。
 */
export const useAuthStore = defineStore('auth', {
  state: () => {
    const session = readSession();
    return {
      token: session?.token ?? '',
      user: session?.user ?? null,
    };
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    role: (state) => state.user?.role ?? 'guest',
    isAdmin: (state) =>
      state.user?.role === 'admin' || state.user?.role === 'superadmin',
    isSuperadmin: (state) => state.user?.role === 'superadmin',
    displayName: (state) => state.user?.nickname || '用户',
  },
  actions: {
    /**
     * 把登录/注册返回的会话写入状态与存储。
     * @param {{ token: string, user: object }} session
     */
    setSession({ token, user }) {
      this.token = token;
      this.user = user;
      writeSession({ token, user });
    },

    /**
     * 登录：调用接口，成功后写入会话。
     * @param {{ loginId: string, password: string }} params
     * @returns {Promise<object>} 当前用户
     */
    async login(params) {
      const data = await loginApi(params);
      const user = normalizeUser(data);
      this.setSession({ token: data.token ?? '', user });
      return user;
    },

    /**
     * 注册：成功后不自动登录（后端注册不返回 token），由页面引导去登录。
     * @param {object} params 见 auth.api register
     * @returns {Promise<object>} 新用户
     */
    async register(params) {
      const data = await registerApi(params);
      return normalizeUser(data);
    },

    /**
     * 更新本地用户字段（资料修改后同步），保留 token。
     * @param {object} patch
     */
    patchUser(patch) {
      if (!this.user) return;
      this.user = { ...this.user, ...patch };
      writeSession({ token: this.token, user: this.user });
    },

    /**
     * 退出登录：清空状态与存储。
     */
    logout() {
      this.token = '';
      this.user = null;
      clearSession();
    },
  },
});
