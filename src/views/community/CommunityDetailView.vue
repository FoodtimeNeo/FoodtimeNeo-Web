<script setup>
import { useRoute, useRouter } from 'vue-router';
import CommunityPostContent from '@/components/community/CommunityPostContent.vue';
const route = useRoute();
const router = useRouter();
</script>
<template>
  <main class="community-detail-view">
    <RouterLink to="/community" class="back-link">← 返回校园社区</RouterLink>
    <div class="community-detail-card">
      <CommunityPostContent
        :post-id="route.params.postId"
        @deleted="router.replace('/community')"
      />
    </div>
  </main>
</template>
<style scoped lang="scss">
.community-detail-view {
  padding: 24px 16px 40px;
  max-width: 1140px;
  margin: auto;
}
.back-link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  margin-bottom: 14px;
  color: var(--ft-color-primary, #e60026);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 150ms ease;

  &:hover {
    opacity: 0.8;
  }
}
.community-detail-card {
  background: var(--zine-paper-card);
  border-radius: 0;
  box-shadow: 5px 6px 0 rgb(58 36 24 / 16%);
  border: 1px solid var(--ft-color-secondary);
  overflow: hidden;
  min-height: 600px;
}
</style>
