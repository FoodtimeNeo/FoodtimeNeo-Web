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
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 12px 36px rgb(58 36 24 / 8%);
  border: 1px solid rgb(213 204 188 / 30%);
  overflow: hidden;
  min-height: 600px;
}
</style>
