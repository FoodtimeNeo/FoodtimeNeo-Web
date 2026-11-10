<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchCommunityAuthor, fetchAuthorPosts } from '@/api/community.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import MediaImage from '@/components/base/MediaImage.vue';
import CommunityPostCard from '@/components/community/CommunityPostCard.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';

const route = useRoute();
const router = useRouter();
const id = String(route.params.userId);
const state = useAsyncData(async (options) => {
  const [author, posts] = await Promise.all([
    fetchCommunityAuthor(id, options),
    fetchAuthorPosts(id, {}, options),
  ]);
  return { author, posts };
});
const loadingMore = ref(false);
const moreError = ref('');

async function loadMore() {
  if (loadingMore.value) return;
  loadingMore.value = true;
  moreError.value = '';
  const current = state.data.value;
  try {
    const page = await fetchAuthorPosts(id, {
      cursor: current.posts.nextCursor,
    });
    state.data.value = {
      author: current.author,
      posts: { ...page, items: [...current.posts.items, ...page.items] },
    };
  } catch (failure) {
    moreError.value = failure.message || '加载更多食记失败';
  } finally {
    loadingMore.value = false;
  }
}

function openPost(post) {
  router.push({ name: 'communityDetail', params: { postId: post.id } });
}
</script>

<template>
  <main class="author">
    <RouterLink :to="{ name: 'community' }">← 返回社区</RouterLink>
    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <template v-else-if="state.data.value">
      <header>
        <MediaImage
          class="author__avatar"
          :src="state.data.value.author.avatarUrl || ''"
          :alt="state.data.value.author.displayName"
          :empty="Array.from(state.data.value.author.displayName || '同')[0]"
          compact
        />
        <h1 class="section-title">{{ state.data.value.author.displayName }}</h1>
      </header>
      <h2>公开食记 · {{ state.data.value.posts.total }}</h2>
      <p v-if="!state.data.value.posts.items.length">
        这位同学还没有公开食记。
      </p>
      <div v-else class="author__posts">
        <CommunityPostCard
          v-for="post in state.data.value.posts.items"
          :key="post.id"
          :post="post"
          @click="openPost"
        />
      </div>
      <p v-if="moreError" role="alert">{{ moreError }}</p>
      <button
        v-if="state.data.value.posts.hasMore"
        class="button-ink"
        type="button"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? '加载中…' : '加载更多' }}
      </button>
    </template>
  </main>
</template>

<style scoped>
.author {
  width: min(calc(100% - 2 * var(--zine-page-padding)), var(--page-max-width));
  margin: var(--ft-space-6) auto;
}
.author header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}
.author__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
}
.author__posts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(140px, 100%), 1fr));
  gap: 12px;
  margin: 16px 0;
  align-items: start;
}
</style>
