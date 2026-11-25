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
      <button type="button" @click="$emit('share')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m7 17 10-10M7 7h10v10" />
        </svg>
        <span>分享</span>
      </button>
      <button type="button" @click="$emit('comment')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M21 6v10a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z"
          />
        </svg>
        <span>评论 {{ post.commentCount || 0 }}</span>
      </button>
      <button
        type="button"
        :disabled="likeBusy"
        :aria-pressed="Boolean(post.likedByMe)"
        @click="$emit('like')"
      >
        <svg
          viewBox="0 0 24 24"
          :fill="post.likedByMe ? 'currentColor' : 'none'"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
          />
        </svg>
        <span
          >{{ post.likedByMe ? '已赞' : '点赞' }}
          {{ post.likeCount || 0 }}</span
        >
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
  gap: 8px;
  min-height: 36px;
  padding-inline-end: 46px;
}
.photo-context__author .media-image,
.photo-context__fallback {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
}
.photo-context__fallback {
  display: grid;
  place-items: center;
  background: #313131;
  font-size: 12px;
}
.photo-context__author strong,
.photo-context__author time {
  display: block;
  overflow-wrap: anywhere;
}
.photo-context__author strong {
  font-size: 14px;
  line-height: 1.25;
}
.photo-context__author time {
  color: rgb(255 255 255 / 72%);
  font-size: 11px;
}
.photo-context__summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(255 255 255 / 90%);
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
  min-height: 32px;
  color: #9fd2f4 !important;
  font-size: 13px;
  padding: 4px 8px 4px 0;
  margin-bottom: 4px;
}
.photo-context__actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.photo-context .photo-context__actions button {
  flex: 1 1 0;
  min-width: 0;
  min-height: 44px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 999px;
  background: rgb(34 34 34 / 72%);
  backdrop-filter: blur(8px);
  font-size: 13px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}
.photo-context__actions svg {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.photo-context__actions button[aria-pressed='true'] {
  color: #ff8a90;
}
@media (max-height: 450px) {
  .photo-context__summary {
    -webkit-line-clamp: 1;
  }
}
</style>
