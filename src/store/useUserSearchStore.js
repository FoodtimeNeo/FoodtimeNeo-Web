import { defineStore } from 'pinia';

/** Keep the search draft on return from a chat; nothing is persisted to browser storage. */
export const useUserSearchStore = defineStore('userSearch', {
  state: () => ({ owner: '', query: '' }),
  actions: {
    bind(user) {
      const owner = user ? `${user.id}:${user.role}` : '';
      if (owner !== this.owner) {
        this.owner = owner;
        this.query = '';
      }
    },
    clear() {
      this.owner = '';
      this.query = '';
    },
  },
});
