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
    <h1 class="section-title">我的</h1>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <template v-else-if="profile">
      <div class="profile-page__identity">
        <MediaImage
          :src="profile.avatarUrl || ''"
          alt="头像"
          empty="未设置头像"
          style="width: 72px; height: 72px; min-height: 72px"
        />
        <div>
          <h2>{{ profile.displayName }}</h2>
          <p class="profile-page__id">ID：{{ profile.id }}</p>
        </div>
      </div>
      <p>{{ profile.email }}</p>
      <p>{{ roleLabels[profile.role] }}</p>
      <nav class="profile-page__links" aria-label="个人功能">
        <RouterLink :to="{ name: 'myReviews' }">我的评论</RouterLink>
        <RouterLink :to="{ name: 'mySubmissions' }">我的提交</RouterLink>
        <RouterLink :to="{ name: 'changePassword' }">修改密码</RouterLink>
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
  gap: 16px;
  align-items: center;
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
.profile-page__links a {
  padding: 12px;
  min-height: 44px;
  border: 1px solid var(--ft-color-text);
}
.profile-page__logout {
  color: var(--ft-color-danger);
  border-color: var(--ft-color-danger);
}
</style>
