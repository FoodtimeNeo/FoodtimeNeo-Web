import { defineStore } from 'pinia';

function readStored(userId, field, fallback) {
  try {
    const raw = localStorage.getItem(`inbox:${userId}:${field}`);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStored(userId, field, value) {
  try {
    localStorage.setItem(`inbox:${userId}:${field}`, JSON.stringify(value));
  } catch {
    // 配额不足或隐私模式时仅保留内存态，不打断流程。
  }
}

// 收件箱本读位：按用户 id 隔离 localStorage 键，切号不串。
export const useInboxStore = defineStore('inbox', {
  state: () => ({ userId: null, lastSeenNoticeId: null, unreadCount: 0 }),
  getters: {
    hasUnread: (state) => state.unreadCount > 0,
  },
  actions: {
    bind(userId) {
      this.userId = userId;
      this.lastSeenNoticeId = readStored(userId, 'lastSeenNoticeId', null);
      this.unreadCount = readStored(userId, 'unreadCount', 0);
    },
    setLastSeenNoticeId(id) {
      this.lastSeenNoticeId = id;
      if (this.userId) writeStored(this.userId, 'lastSeenNoticeId', id);
    },
    setUnreadCount(count) {
      this.unreadCount = count;
      if (this.userId) writeStored(this.userId, 'unreadCount', count);
    },
    clear() {
      this.userId = null;
      this.lastSeenNoticeId = null;
      this.unreadCount = 0;
    },
  },
});
