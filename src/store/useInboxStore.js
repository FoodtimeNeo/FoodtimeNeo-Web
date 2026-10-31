import { defineStore } from 'pinia';

// Server read state is authoritative. No persistent local popup watermark.
export const useInboxStore = defineStore('inbox', {
  state: () => ({ userId: null, unreadCount: 0 }),
  getters: { hasUnread: (state) => state.unreadCount > 0 },
  actions: {
    bind(userId) {
      this.userId = userId;
      this.unreadCount = 0;
    },
    setUnreadCount(count) {
      this.unreadCount = count;
    },
    clear() {
      this.userId = null;
      this.unreadCount = 0;
    },
  },
});
