<script setup>
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchCanteen, fetchStalls } from '@/api/canteen.api.js';
import CanteenMenu from '@/components/canteen/CanteenMenu.vue';
import VenueRatingSummary from '@/components/venue/VenueRatingSummary.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import MediaImage from '@/components/base/MediaImage.vue';
import CatalogQuickActions from '@/components/admin/CatalogQuickActions.vue';
import { useAuthStore } from '@/store/useAuthStore.js';
const auth = useAuthStore();
const route = useRoute();
const canteenId = computed(() => String(route.params.canteenId));
const hall = useAsyncData((options) => fetchCanteen(canteenId.value, options), {
  cacheKey: () => `canteen:${canteenId.value}`,
  ttl: 0,
});
const list = useAsyncData((options) => fetchStalls(canteenId.value, options), {
  initial: [],
  cacheKey: () => `stalls:${canteenId.value}`,
  ttl: 0,
});
watch(canteenId, () => {
  hall.cancel();
  list.cancel();
  hall.data.value = null;
  list.data.value = [];
  void hall.load();
  void list.load();
});
</script>
<template>
  <main class="canteen-detail">
    <LoadingState v-if="hall.initialLoading.value" message="正在打开食堂…" />
    <ErrorState
      v-else-if="hall.error.value"
      :title="
        hall.error.value.code === 'NOT_FOUND' ? '食堂不存在' : '暂时无法加载'
      "
      :description="hall.error.value.message"
      @retry="hall.load"
    />
    <template v-else-if="hall.data.value">
      <header class="canteen-detail__hero">
        <MediaImage
          v-if="hall.data.value.coverImageUrl"
          class="canteen-detail__hero-image"
          compact
          :src="hall.data.value.coverImageUrl"
          alt=""
        />
        <div>
          <h1>{{ hall.data.value.name }}</h1>
          <p v-if="!list.loading.value && !list.error.value">
            {{ list.data.value.length }} 个档口
          </p>
        </div>
        <RouterLink
          class="canteen-detail__review"
          :to="{
            name: 'venueReviews',
            params: { type: 'hall', targetId: canteenId },
          }"
          >评价 ›</RouterLink
        >
      </header>
      <details class="canteen-detail__info">
        <summary>食堂信息</summary>
        <VenueRatingSummary
          :key="canteenId"
          type="hall"
          :target-id="canteenId"
        />
        <CatalogQuickActions
          :id="canteenId"
          type="dining-halls"
          :back-to="{ name: 'canteenList' }"
          @updated="hall.load"
          @images-changed="hall.load"
        />
        <RouterLink
          class="canteen-detail__submission"
          :to="{ name: 'stallSubmission', params: { canteenId } }"
          >投稿档口</RouterLink
        >
      </details>
      <LoadingState v-if="list.initialLoading.value" message="正在读取档口…" />
      <ErrorState
        v-else-if="list.error.value"
        :description="list.error.value.message"
        @retry="list.load"
      />
      <EmptyState
        v-else-if="!list.data.value.length"
        title="这个食堂还没有档口"
      />
      <CanteenMenu
        v-else
        :key="canteenId"
        :canteen-id="canteenId"
        :stalls="list.data.value"
        :owner-id="auth.user?.id || ''"
      />
    </template>
  </main>
</template>
<style scoped>
.canteen-detail {
  width: min(100%, 1080px);
  margin: 0 auto;
}
.canteen-detail__hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px 8px;
}
.canteen-detail__hero > div:not(.media-image) {
  flex: 1;
  min-width: 0;
}
.canteen-detail h1 {
  margin: 0;
  font: clamp(24px, 5vw, 36px) var(--ft-font-family-title);
  overflow-wrap: anywhere;
}
.canteen-detail__hero p {
  margin: 8px 0 0;
  color: var(--ft-color-text-muted);
  font-size: 13px;
}
.canteen-detail__hero-image {
  width: 68px;
  height: 68px;
  min-height: 0;
  flex: none;
  border-radius: 12px;
  overflow: hidden;
}
.canteen-detail__review {
  flex: none;
  min-height: 44px;
  display: flex;
  align-items: center;
  font-size: 14px;
}
.canteen-detail__info {
  padding: 0 16px 8px;
}
.canteen-detail__info summary {
  display: flex;
  align-items: center;
  min-height: 44px;
  cursor: pointer;
  color: var(--ft-color-text-muted);
  font-size: 14px;
}
.canteen-detail__info summary::after {
  content: '⌄';
  margin-left: 6px;
}
.canteen-detail__submission {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  color: var(--ft-color-primary);
}
</style>
