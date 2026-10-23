<script setup>
import { ref, watch } from 'vue';
import { fetchCommunityPostDetail } from '@/api/community.api.js';
import CommunityImageViewer from './CommunityImageViewer.vue';
import CommunityCommentSection from './CommunityCommentSection.vue';
const props = defineProps({ postId: { type: String, required: true } });
const post = ref(null),
  error = ref(''),
  loading = ref(false);
let version = 0;
async function load() {
  const current = ++version;
  loading.value = true;
  error.value = '';
  try {
    const result = await fetchCommunityPostDetail(props.postId);
    if (current === version) post.value = result;
  } catch (e) {
    if (current === version) error.value = e.message || '帖子加载失败';
  } finally {
    if (current === version) loading.value = false;
  }
}
watch(
  () => props.postId,
  () => {
    post.value = null;
    load();
  },
  { immediate: true },
);
</script>
<template>
  <p v-if="error" role="alert">
    {{ error }} <button type="button" @click="load">重试</button>
  </p>
  <p v-else-if="loading && !post" role="status">食记加载中…</p>
  <article v-if="post && !error" class="community-post-content">
    <div class="post-media">
      <CommunityImageViewer :images="post.images" :alt="post.title" />
    </div>
    <div class="post-copy">
      <header>
        <img
          v-if="post.author?.avatar"
          :src="post.author.avatar"
          alt=""
          class="author-avatar"
        /><span class="author-name">{{ post.author?.name || '同学' }}</span
        ><time>{{ new Date(post.createdAt).toLocaleString('zh-CN') }}</time>
      </header>
      <p v-if="post.status === 'pending'" class="audit-banner" role="status">
        正在审核中 · 通过前仅自己可见{{
          post.reviewStage === 'manual_pending' ? '，已转人工审核' : ''
        }}
      </p>
      <p v-if="post.status === 'rejected'" class="audit-banner">
        未通过审核：{{ post.reviewReason || '请遵守社区规范' }}
      </p>
      <h1>{{ post.title }}</h1>
      <p class="post-body">{{ post.content }}</p>
      <CommunityCommentSection
        v-if="post.status === 'approved'"
        :post-id="post.id"
        @changed="load"
      />
    </div>
  </article>
</template>
<style scoped>
.community-post-content {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 24px;
  color: var(--ft-color-text, #372b24);
}
.post-media,
.post-copy {
  min-width: 0;
}
.post-copy {
  max-height: 78vh;
  overflow-y: auto;
  padding-right: 8px;
}
header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ft-color-border);
}
.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
.author-name {
  font-weight: 700;
}
time {
  font-size: 12px;
  color: var(--ft-color-text-secondary, #706458);
}
h1 {
  font-size: 24px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.post-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
}
.audit-banner {
  padding: 12px;
  border-radius: 8px;
  background: var(--ft-color-bg, #f1ece2);
  color: var(--ft-color-primary, #c9341e);
}
@media (max-width: 760px) {
  .community-post-content {
    grid-template-columns: minmax(0, 1fr);
  }
  .post-copy {
    max-height: none;
    overflow: visible;
  }
}
</style>
