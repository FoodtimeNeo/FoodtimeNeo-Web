<script setup>
import { computed } from 'vue';
import PublisherDetails from '@/components/base/PublisherDetails.vue';
import MediaImage from '@/components/base/MediaImage.vue';
import AiVerdict from '@/components/base/AiVerdict.vue';
import CommunityImageViewer from '@/components/community/CommunityImageViewer.vue';
import { formatPrice } from '@/utils/mediaUrl.js';
import { formatTime } from '@/utils/recordLabels.js';

const props = defineProps({
  row: { type: Object, required: true },
  details: { type: Object, default: null },
  full: Boolean,
});
const publisher = computed(() =>
  props.details
    ? {
        ...(props.details.comment || props.details.post),
        userEmail: props.details.userEmail,
      }
    : props.row,
);
const hasAi = computed(
  () =>
    [
      'hall-review',
      'stall-review',
      'hall-review-reply',
      'stall-review-reply',
      'dish',
      'review',
      'photo',
      'dish-review-reply',
      'community-post',
      'community-comment',
    ].includes(props.row.type) || Boolean(props.row.aiRiskLevel),
);
</script>

<template>
  <div class="audit-content">
    <PublisherDetails :row="publisher" />
    <p class="audit-content__id">投稿 ID：{{ row.id }}</p>
    <p v-if="row.rating">评分：{{ row.rating }} / 5</p>
    <p v-if="row.type === 'dish'">投稿价格：{{ formatPrice(row.price) }}</p>
    <template v-if="full && details?.post">
      <section class="audit-content__context" aria-label="完整社区审核内容">
        <h3>{{ details.post.title }}</h3>
        <p class="audit-content__text">{{ details.post.content }}</p>
        <CommunityImageViewer
          v-if="details.post.images?.length"
          :images="details.post.images"
          :alt="details.post.title"
        />
        <template v-if="details.comment">
          <blockquote v-if="details.rootComment">
            一级评论：{{
              details.rootComment.deleted
                ? '已删除'
                : details.rootComment.content
            }}
          </blockquote>
          <blockquote v-if="details.replyToComment">
            实际回复对象：{{ details.replyToComment.userDisplayName }} ·
            {{
              details.replyToComment.deleted
                ? '已删除'
                : details.replyToComment.content
            }}
          </blockquote>
          <h4>本次审核{{ details.comment.rootCommentId ? '回复' : '评论' }}</h4>
          <p class="audit-content__text">{{ details.comment.content }}</p>
        </template>
      </section>
    </template>
    <template v-else>
      <p
        v-if="row.content"
        class="audit-content__text"
        :class="{ 'audit-content__preview': !full }"
      >
        {{ row.content }}
      </p>
      <CommunityImageViewer
        v-if="full && row.imageUrl"
        :images="[{ url: row.imageUrl }]"
        :alt="row.name || '投稿配图'"
      />
      <MediaImage
        v-else-if="row.imageUrl"
        :src="row.imageUrl"
        alt="投稿配图"
        fit="contain"
        class="audit-content__thumbnail"
      />
    </template>
    <section
      v-if="full && details?.venue"
      class="audit-content__context"
      aria-label="原评价与本次提交对照"
    >
      <h3>当前公开评价</h3>
      <template v-if="details.publicVersion"
        ><p>评分：{{ details.publicVersion.rating }} / 5</p>
        <p class="audit-content__text">{{ details.publicVersion.content }}</p>
        <p>
          首次公开：{{ formatTime(details.publicVersion.createdAt) }}
        </p></template
      >
      <p v-else>暂无公开评价</p>
      <h3>本次提交</h3>
      <p v-if="details.submission?.rating">
        评分：{{ details.submission.rating }} / 5
      </p>
      <p class="audit-content__text">{{ details.submission?.content }}</p>
    </section>
    <AiVerdict
      v-if="hasAi"
      :risk-level="row.aiRiskLevel"
      :confidence="row.aiConfidence"
      :labels="row.aiLabels"
      :reason="row.aiReason"
      :checked-at="row.aiCheckedAt"
    />
    <p
      v-if="['dish', 'photo'].includes(row.type)"
      class="audit-content__policy"
    >
      菜品与菜品图片的通过须由管理员确认。
    </p>
    <p v-if="row.reason" class="audit-content__text">
      审核说明：{{ row.reason }}
    </p>
  </div>
</template>

<style scoped>
.audit-content {
  overflow-wrap: anywhere;
}
.audit-content > p {
  margin: 10px 0;
}
.audit-content :deep(.publisher-details) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 20px;
}
.audit-content :deep(.publisher-details p) {
  margin: 2px 0;
}
.audit-content__id,
.audit-content__policy {
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.audit-content__text {
  white-space: pre-wrap;
  line-height: 1.7;
}
.audit-content__preview {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.audit-content__thumbnail {
  display: block;
  width: min(100%, 220px);
  height: 140px;
  object-fit: contain;
  margin: 12px 0;
  background: var(--zine-paper-card-alt);
}
.audit-content__context {
  margin: 16px 0;
  padding-top: 16px;
  border-top: 1px solid var(--ft-color-border);
}
blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 3px solid var(--ft-color-border);
  background: var(--zine-paper-card-alt);
  white-space: pre-wrap;
}
@media (max-width: 560px) {
  .audit-content :deep(.publisher-details) {
    grid-template-columns: 1fr;
  }
}
</style>
