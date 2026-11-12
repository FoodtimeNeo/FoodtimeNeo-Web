import { defineStore } from 'pinia';
import {
  fetchHistorySettings,
  recordBrowsingHistory,
  updateHistorySettings,
} from '@/api/browsingHistory.api.js';

function newEventId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useBrowsingHistoryStore = defineStore('browsingHistory', {
  state: () => ({
    enabled: true,
    revision: 0,
    dishEpoch: 0,
    postEpoch: 0,
    loaded: false,
    loading: null,
  }),
  getters: {
    epoch: (state) => (kind) =>
      kind === 'dish' ? state.dishEpoch : state.postEpoch,
  },
  actions: {
    apply(settings) {
      this.enabled = Boolean(settings.enabled);
      this.revision = Number(settings.revision) || 0;
      this.dishEpoch = Number(settings.dishEpoch) || 0;
      this.postEpoch = Number(settings.postEpoch) || 0;
      this.loaded = true;
      return settings;
    },
    async refresh() {
      const settings = await fetchHistorySettings();
      return this.apply(settings);
    },
    async ensure() {
      if (this.loaded) return;
      if (!this.loading) {
        this.loading = this.refresh().finally(() => {
          this.loading = null;
        });
      }
      await this.loading;
    },
    async updateEnabled(enabled) {
      const settings = await updateHistorySettings({
        enabled,
        expectedRevision: this.revision,
      });
      return this.apply(settings);
    },
    /**
     * History failures never block detail rendering. A stale epoch means the
     * current real visit can retry once after refreshing settings.
     */
    async record(kind, targetId) {
      try {
        await this.ensure();
        if (!this.enabled) return;
        const body = {
          epoch: this.epoch(kind),
          visitEventId: newEventId(),
        };
        try {
          await recordBrowsingHistory(kind, targetId, body);
        } catch (error) {
          if (error?.code !== 'HISTORY_EPOCH_STALE') return;
          await this.refresh();
          if (!this.enabled) return;
          await recordBrowsingHistory(kind, targetId, {
            epoch: this.epoch(kind),
            visitEventId: body.visitEventId,
          });
        }
      } catch {
        // Browsing history is best-effort; never turn it into a detail error.
      }
    },
  },
});
