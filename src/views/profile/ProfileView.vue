<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchProfile } from '@/api/auth.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { roleLabels } from '@/utils/recordLabels.js';
import MediaImage from '@/components/base/MediaImage.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import InkButton from '@/components/base/InkButton.vue';
const auth = useAuthStore();
const router = useRouter();
const {
  data: profile,
  error,
  loading,
  load,
} = useAsyncData(async () => {
  const user = await fetchProfile();
  auth.setSession({ user });
  return user;
});
const exiting = ref(false);
const exitError = ref('');
async function logout() {
  if (exiting.value) return;
  exiting.value = true;
  exitError.value = '';
  try {
    await auth.logout();
    await router.replace({ name: 'login' });
  } catch (error) {
    exitError.value = error.message || '退出失败，请稍后重试';
  } finally {
    exiting.value = false;
  }
}
</script>
<template>
  <div class="profile-page">
    <div class="section-rule">
      <span class="section-rule__index">06</span>
      <span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">
      我的<span class="zine-highlight">食堂档案</span>
    </h1>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <template v-else-if="profile">
      <article class="profile-page__identity torn-edge">
        <div class="profile-page__avatar" role="img" aria-label="个人头像">
          <MediaImage
            compact
            :src="profile.avatarUrl || ''"
            alt=""
            :empty="Array.from(profile.displayName?.trim() || '我')[0]"
            aria-hidden="true"
          />
        </div>
        <div class="profile-page__identity-copy">
          <span class="sticker sticker--r-1">个人档案</span>
          <h2>{{ profile.displayName }}</h2>
          <p class="profile-page__id">ID：{{ profile.id }}</p>
        </div>
      </article>
      <div class="profile-page__meta">
        <span class="zine-chip">{{ profile.email }}</span>
        <span class="stamp">{{ roleLabels[profile.role] }}</span>
      </div>
      <nav class="profile-page__links" aria-label="个人功能">
        <RouterLink class="paper-link" :to="{ name: 'inboxView' }"
          ><span class="stamp">信箱</span
          ><span>消息信箱<small>公告与系统消息</small></span
          ><strong>→</strong></RouterLink
        >
        <RouterLink class="paper-link" :to="{ name: 'myReviewReplies' }"
          ><span class="stamp">回复</span
          ><span>我的回复<small>楼内讨论与审核状态</small></span
          ><strong>→</strong></RouterLink
        >
        <RouterLink class="paper-link" :to="{ name: 'myReviews' }"
          ><span class="stamp">01</span
          ><span>我的评论<small>已发布的点评</small></span
          ><strong>→</strong></RouterLink
        >
        <RouterLink class="paper-link" :to="{ name: 'mySubmissions' }"
          ><span class="stamp">02</span
          ><span>我的提交<small>投稿记录与审核结果</small></span
          ><strong>→</strong></RouterLink
        >
        <RouterLink class="paper-link" :to="{ name: 'changePassword' }"
          ><span class="stamp">03</span> 修改密码 <strong>→</strong></RouterLink
        >
      </nav>
      <p v-if="exitError" role="alert">{{ exitError }}</p>
      <InkButton
        class="profile-page__logout"
        :disabled="exiting"
        @click="logout"
        >{{ exiting ? '退出中…' : '退出登录' }}</InkButton
      >
    </template>
  </div>
</template>
<style scoped>
.profile-page {
  padding: var(--ft-space-3);
  max-width: 760px;
  margin: auto;
  overflow-wrap: anywhere;
}
.profile-page__identity {
  display: flex;
  position: relative;
  align-items: center;
  gap: 16px;
  margin-top: var(--ft-space-3);
  padding: var(--ft-space-3);
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 5px 6px 0 rgb(58 36 24 / 16%);
}
.profile-page__avatar {
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
  border: 7px solid #fff;
  box-shadow: 3px 3px 0 rgb(58 36 24 / 20%);
  transform: rotate(-2deg);
}
.profile-page__avatar :deep(.media-image) {
  min-height: 0;
}
.profile-page__avatar :deep(span) {
  padding: 0;
  font-family: var(--ft-font-family-title);
  font-size: 32px;
}
.profile-page__identity-copy {
  min-width: 0;
}
.profile-page__identity-copy h2 {
  margin: 10px 0 0;
}
.profile-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: var(--ft-space-3) 0;
}
.profile-page__identity > div {
  min-width: 0;
}
h2 {
  font-family: var(--ft-font-family-title);
}
.profile-page__id {
  font-size: 14px;
}
.profile-page__links {
  display: grid;
  gap: 12px;
  margin: 24px 0;
}
.profile-page__links a.paper-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  min-height: 44px;
  border: 1px dashed rgb(58 36 24 / 34%);
  background: rgb(255 250 240 / 72%);
  font-family: var(--ft-font-family-title);
  font-size: 20px;
  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}
.profile-page__links a.paper-link:hover {
  box-shadow: 4px 4px 0 rgb(58 36 24 / 18%);
  transform: translate(-2px, -2px);
}
.profile-page__links strong {
  margin-left: auto;
  color: var(--ft-color-primary);
}
.profile-page__links small {
  display: block;
  color: var(--ft-color-text-muted);
  font-family: inherit;
  font-size: 14px;
  font-weight: normal;
}
.profile-page__logout {
  color: var(--ft-color-danger);
  border-color: var(--ft-color-danger);
}

@media (prefers-reduced-motion: reduce) {
  .profile-page__links a.paper-link,
  .profile-page__links a.paper-link:hover {
    transform: none;
    transition: none;
  }
}
</style>
