<script setup>
import { computed, ref } from 'vue';
import { usePagedData } from '@/composables/usePagedData.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  fetchFollowers,
  fetchFollowing,
  followUser,
  unfollowUser,
} from '@/api/follow.api.js';
import MediaImage from '@/components/base/MediaImage.vue';
import BackLink from '@/components/base/BackLink.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const props = defineProps({
  kind: {
    type: String,
    default: 'following',
    validator: (value) => ['following', 'followers'].includes(value),
  },
});

const auth = useAuthStore();
const isFollowers = computed(() => props.kind === 'followers');
const title = computed(() => (isFollowers.value ? '关注我的' : '我的关注'));

const { items, page, total, size, error, loading, load } = usePagedData(
  (pageNumber, options) => {
    const userId = auth.user?.id;
    if (!userId)
      return Promise.resolve({ items: [], total: 0, page: 1, size: 20 });
    return isFollowers.value
      ? fetchFollowers(userId, pageNumber, options)
      : fetchFollowing(userId, pageNumber, options);
  },
);

const actingId = ref(null);
const actionError = ref('');

async function toggle(row) {
  if (actingId.value) return;
  actingId.value = row.id;
  actionError.value = '';
  try {
    const state = row.followedByMe
      ? await unfollowUser(row.id)
      : await followUser(row.id);
    row.followedByMe = state.followed;
  } catch (failure) {
    actionError.value = failure.message || '操作失败，请稍后重试';
  } finally {
    actingId.value = null;
  }
}
</script>

<template>
  <div class="follow-page">
    <BackLink />
    <div class="section-rule">
      <span class="section-rule__index">09</span
      ><span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">
      <span class="zine-highlight">{{ title }}</span>
    </h1>

    <nav class="follow-page__tabs" aria-label="关注分类">
      <RouterLink
        :to="{ name: 'myFollowing' }"
        :class="{ 'is-active': !isFollowers }"
        >我的关注</RouterLink
      >
      <RouterLink
        :to="{ name: 'myFollowers' }"
        :class="{ 'is-active': isFollowers }"
        >关注我的</RouterLink
      >
    </nav>

    <p v-if="actionError" role="alert">{{ actionError }}</p>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState
      v-else-if="!items.length"
      :title="isFollowers ? '还没有人关注你' : '还没有关注任何人'"
      :description="
        isFollowers
          ? '发布食记或点评，让更多同学发现你。'
          : '在社区动态中点击作者旁的“关注”，就会出现在这里。'
      "
    >
      <RouterLink class="button-ink" :to="{ name: 'community' }"
        >去社区看看</RouterLink
      >
    </EmptyState>
    <template v-else>
      <ul class="follow-page__list">
        <li v-for="row in items" :key="row.id" class="follow-page__item">
          <MediaImage
            compact
            :src="row.avatarUrl || ''"
            :alt="row.displayName"
            :empty="Array.from(row.displayName?.trim() || '饭')[0]"
          />
          <span class="follow-page__name">{{ row.displayName }}</span>
          <button
            class="button-ink"
            type="button"
            :disabled="actingId !== null"
            @click="toggle(row)"
          >
            {{
              actingId === row.id
                ? '处理中…'
                : row.followedByMe
                  ? '已关注'
                  : '关注'
            }}
          </button>
        </li>
      </ul>
      <PaginationControls
        v-if="total > size"
        :page="page"
        :total="total"
        :size="size"
        :disabled="loading"
        @change="page = $event"
      />
    </template>
  </div>
</template>

<style scoped>
.follow-page {
  padding: var(--ft-space-3);
  max-width: 760px;
  margin: auto;
  overflow-wrap: anywhere;
}
.follow-page__tabs {
  display: flex;
  gap: 8px;
  margin: 12px 0 20px;
}
.follow-page__tabs a {
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  border-radius: 999px;
  font-weight: 700;
}
.follow-page__tabs a.is-active {
  border-color: var(--zine-stamp-red);
  color: var(--zine-stamp-red);
}
.follow-page__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.follow-page__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--ft-color-border);
  background: var(--ft-color-surface);
}
.follow-page__name {
  flex: 1;
  font-weight: 700;
}
</style>
