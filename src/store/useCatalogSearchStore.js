import { defineStore } from 'pinia';

// Only keep short search preferences in memory; no catalog data or credentials.
export const useCatalogSearchStore = defineStore('catalog-search', {
  state: () => ({ queries: {} }),
  actions: {
    setQuery(key, value) {
      if (!value) delete this.queries[key];
      else {
        delete this.queries[key];
        this.queries[key] = value;
        const keys = Object.keys(this.queries);
        if (keys.length > 50) delete this.queries[keys[0]];
      }
    },
  },
});
