<script setup>
import MediaImage from '@/components/base/MediaImage.vue';

defineProps({
  post: { type: Object, required: true },
  time: { type: String, default: '' },
  likeBusy: Boolean,
});
defineEmits(['post', 'comment', 'share', 'like']);
</script>

<template>
  <div class="photo-context">
    <div class="photo-context__author">
      <MediaImage
        v-if="post.author?.avatar"
        :src="post.author.avatar"
        alt=""
        compact
        eager
      />
      <span v-else class="photo-context__fallback" aria-hidden="true">{{
        Array.from(post.author?.name || '同')[0]
      }}</span>
      <div>
        <strong>{{ post.author?.name || '同学' }}</strong>
        <time v-if="time" :datetime="post.createdAt">{{ time }}</time>
      </div>
    </div>
    <p class="photo-context__summary">{{ post.title }} {{ post.content }}</p>
    <button type="button" class="photo-context__post" @click="$emit('post')">
      查看帖子
    </button>
    <div v-if="post.status === 'approved'" class="photo-context__actions">
      <button type="button" @click="$emit('share')">↗ 分享</button>
      <button type="button" @click="$emit('comment')">
        评论 {{ post.commentCount || 0 }}
      </button>
      <button
        type="button"
        :disabled="likeBusy"
        :aria-pressed="Boolean(post.likedByMe)"
        @click="$emit('like')"
      >
        {{ post.likedByMe ? '♥ 已赞' : '♡ 点赞' }} {{ post.likeCount || 0 }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.photo-context {
  max-width: 640px;
  margin-inline: auto;
}
.photo-context__author {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding-inline-end: 54px;
}
.photo-context__author .media-image,
.photo-context__fallback {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.photo-context__fallback {
  display: grid;
  place-items: center;
  background: #313131;
}
.photo-context__author strong,
.photo-context__author time {
  display: block;
  overflow-wrap: anywhere;
}
.photo-context__author time {
  color: #c0c0c0;
  font-size: 12px;
}
.photo-context__summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 8px 0 0;
  overflow-wrap: anywhere;
}
.photo-context button {
  border: 0;
  min-height: 44px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  pointer-events: auto;
}
.photo-context button:focus-visible {
  outline: 2px solid #fff;
}
.photo-context__post {
  color: #abd9f3 !important;
  padding: 0;
}
.photo-context__actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.photo-context__actions button {
  flex: 1;
  border-radius: 8px;
  background: #242424cc;
}
.photo-context__actions button[aria-pressed='true'] {
  color: #ff999c;
}
@media (max-height: 450px) {
  .photo-context__summary {
    -webkit-line-clamp: 1;
  }
}
</style>
