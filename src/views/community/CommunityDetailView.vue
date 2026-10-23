<script setup>
import { useRoute, useRouter } from 'vue-router';
import CommunityPostContent from '@/components/community/CommunityPostContent.vue';
const route = useRoute();
const router = useRouter();
</script>
<template>
  <main class="community-detail-view">
    <RouterLink to="/community" class="back-link">返回校园社区</RouterLink
    ><CommunityPostContent
      :post-id="route.params.postId"
      @deleted="router.replace('/community')"
    />
  </main>
</template>
<style scoped>
.community-detail-view {
  padding: 24px;
  max-width: 1140px;
  margin: auto;
}
.back-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-bottom: 12px;
  color: var(--ft-color-primary, #c9341e);
}
</style>
