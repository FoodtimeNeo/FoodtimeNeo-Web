<script setup>
import { watch } from 'vue';
import { fetchDailyRecommendations } from '@/api/recommendation.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import MediaImage from '@/components/base/MediaImage.vue';
const props = defineProps({ ownerId: { type: String, default: '' } });
const { data, loading, error, load, cancel } = useAsyncData(
  fetchDailyRecommendations,
  {
    immediate: false,
    initial: [],
  },
);
watch(
  () => props.ownerId,
  (owner) => {
    cancel();
    data.value = [];
    error.value = null;
    if (owner) void load();
  },
  { immediate: true },
);
</script>
<template>
  <div class="search-discovery">
    <p v-if="loading && !data.length" role="status">正在读取推荐…</p>
    <div v-if="error" role="alert">
      <p>{{ error.message }}</p>
      <button type="button" @click="load">重试</button>
    </div>
    <template v-if="data.length">
      <section aria-label="发现">
        <h2>发现</h2>
        <div class="search-discovery__chips">
          <RouterLink v-for="item in data" :key="item.id" :to="item.route">{{
            item.name
          }}</RouterLink>
        </div>
      </section>
      <section aria-label="猜你想搜">
        <h2>猜你想搜</h2>
        <div class="search-discovery__cards">
          <RouterLink
            v-for="item in data"
            :key="item.id"
            :to="item.route"
            class="search-discovery__card"
          >
            <MediaImage compact :src="item.coverImageUrl" alt="" empty="" />
            <div>
              <h3>{{ item.name }}</h3>
              <p>{{ item.canteenName }}</p>
              <p v-if="item.intro">{{ item.intro }}</p>
            </div>
          </RouterLink>
        </div>
      </section>
    </template>
    <p v-else-if="!loading && !error">今日暂无推荐</p>
  </div>
</template>
<style scoped>
.search-discovery {
  margin-top: 20px;
}
.search-discovery h2 {
  font-size: 19px;
  margin: 18px 0 12px;
}
.search-discovery__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.search-discovery__chips a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--ft-color-alt, #f5efdf);
  color: var(--ft-color-text);
  overflow-wrap: anywhere;
}
.search-discovery__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.search-discovery__card {
  min-width: 0;
  overflow: hidden;
  border-radius: 14px;
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-border);
  color: var(--ft-color-text);
}
.search-discovery__card :deep(.media-image) {
  width: 100%;
  height: auto;
  min-height: 0;
  aspect-ratio: 1;
  position: relative;
}
.search-discovery__card :deep(.media-image > img) {
  position: absolute;
  inset: 0;
}
.search-discovery__card > div:not(.media-image) {
  padding: 12px;
}
.search-discovery h3 {
  margin: 0 0 6px;
  font-size: 16px;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.search-discovery p {
  color: var(--ft-color-text-muted);
  font-size: 13px;
  margin: 5px 0;
  overflow-wrap: anywhere;
}
@media (max-width: 340px) {
  .search-discovery__cards {
    gap: 8px;
  }
}
</style>
