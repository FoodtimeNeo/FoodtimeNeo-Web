<script setup>
import { computed, ref } from 'vue';
import { setCommentLike } from '@/api/community.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
const props = defineProps({
  item: { type: Object, required: true },
  allowReplies: { type: Boolean, default: true },
});
const emit = defineEmits(['reply', 'delete', 'updated']);
const auth = useAuthStore();
const mine = computed(() => props.item.userId === auth.user?.id);
const acting = ref(false),
  error = ref('');
async function like() {
  if (acting.value) return;
  acting.value = true;
  error.value = '';
  try {
    const state = await setCommentLike(props.item.id, !props.item.likedByMe);
    emit('updated', { likedByMe: state.liked, likeCount: state.likeCount });
  } catch (e) {
    error.value = e.message || '点赞失败';
  } finally {
    acting.value = false;
  }
}
</script>
<template>
  <article class="comment-item" :data-comment-id="item.id">
    <img
      v-if="item.author?.avatar && !item.deleted"
      class="avatar"
      :src="item.author.avatar"
      alt=""
    />
    <span v-else class="avatar avatar-fallback" aria-hidden="true">{{
      item.deleted ? '·' : (item.author?.name || '同').slice(0, 1)
    }}</span>
    <div class="comment-copy">
      <p class="comment-author">
        {{ item.deleted ? '原评论已删除' : item.author?.name || '同学' }}
      </p>
      <p v-if="item.deleted" class="tombstone">
        这条评论已删除，楼内回复仍可查看。
      </p>
      <p v-else class="comment-text">
        <span v-if="item.rootCommentId" class="reply-target"
          >回复 {{ item.replyToDisplayName || '同学' }}：</span
        >{{ item.content }}
      </p>
      <p v-if="error" role="alert">{{ error }}</p>
      <div class="comment-meta">
        <button
          v-if="!item.deleted && item.status === 'approved'"
          type="button"
          class="comment-like"
          :aria-pressed="!!item.likedByMe"
          :disabled="acting"
          @click="like"
        >
          {{ item.likedByMe ? '♥' : '♡' }} {{ item.likeCount || 0 }}
        </button>
        <time>{{
          new Date(item.createdAt).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        }}</time>
        <span v-if="item.status === 'pending'">审核中 · 仅自己可见</span>
        <span v-if="item.status === 'rejected'"
          >未通过：{{ item.reviewReason || '请遵守社区规范' }}</span
        >
        <button
          v-if="allowReplies && !item.deleted && item.status === 'approved'"
          type="button"
          class="reply-button"
          @click="emit('reply', item)"
        >
          回复
        </button>
        <button
          v-if="mine && !item.deleted"
          type="button"
          class="delete-button"
          @click="emit('delete', item)"
        >
          删除
        </button>
      </div>
    </div>
  </article>
</template>
<style scoped>
.comment-item {
  display: flex;
  gap: 10px;
  padding: 14px 0;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--ft-color-border);
  color: var(--ft-color-text);
}
.comment-copy {
  flex: 1;
  min-width: 0;
}
p {
  margin: 0;
}
.comment-author,
.reply-target {
  color: var(--ft-color-text-secondary, #706458);
  font-size: 13px;
}
.comment-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
  margin-top: 4px;
  font-size: 15px;
}
.comment-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--ft-color-text-secondary, #706458);
}
button {
  min-height: 44px;
  padding: 4px 8px;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.tombstone {
  font-size: 14px;
  color: var(--ft-color-text-secondary, #706458);
  padding-top: 4px;
}
</style>
