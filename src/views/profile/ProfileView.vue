<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchProfile } from '@/api/auth.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { roleLabels } from '@/utils/recordLabels.js';
import MediaImage from '@/components/base/MediaImage.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import InkButton from '@/components/base/InkButton.vue';
import ProfileEditor from './ProfileEditor.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppearancePicker from '@/components/base/AppearancePicker.vue';
import IosInstallSteps from '@/components/common/IosInstallSteps.vue';
import SchoolEmailBinder from '@/components/profile/SchoolEmailBinder.vue';
import { isIosDevice, isStandaloneMode } from '@/utils/iosPwa.js';
const auth = useAuthStore();
const router = useRouter();
const showIosHomeGuide = isIosDevice() && !isStandaloneMode();
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
const navigationGroups = computed(() => [
  {
    id: 'saved',
    title: '常用',
    links: [
      { label: '想吃清单', icon: 'dish', to: { name: 'favoriteDishes' } },
      {
        label: '帖子收藏',
        icon: 'star',
        to: { name: 'community', query: { tab: 'favorites' } },
      },
      { label: '浏览历史', icon: 'clock', to: { name: 'browsingHistory' } },
      {
        label: '发帖草稿',
        icon: 'edit',
        to: { name: 'community', query: { action: 'new' } },
      },
    ],
  },
  {
    id: 'records',
    title: '我的记录',
    links: [
      {
        label: '我的食记',
        icon: 'note',
        to: { name: 'community', query: { tab: 'mine' } },
      },
      { label: '菜品点评', icon: 'comment', to: { name: 'myReviews' } },
      { label: '餐厅点评', icon: 'store', to: { name: 'myVenueReviews' } },
      { label: '我的回复', icon: 'reply', to: { name: 'myReviewReplies' } },
      { label: '我的提交', icon: 'upload', to: { name: 'mySubmissions' } },
    ],
  },
  {
    id: 'messages',
    title: '服务',
    links: [
      { label: '消息信箱', icon: 'inbox', to: { name: 'inboxView' } },
      { label: '建议与反馈', icon: 'feedback', to: { name: 'myFeedback' } },
      { label: '我的纠错', icon: 'correct', to: { name: 'myCorrections' } },
      { label: '举报与申诉', icon: 'shield', to: { name: 'myReports' } },
    ],
  },
  {
    id: 'account',
    title: '账号与隐私',
    links: [
      { label: '黑名单', icon: 'block', to: { name: 'myBlockedUsers' } },
      { label: '修改密码', icon: 'lock', to: { name: 'changePassword' } },
      ...(!auth.isAdmin
        ? [
            {
              label: '账号安全',
              icon: 'key',
              to: { name: 'accountLifecycle' },
            },
          ]
        : []),
    ],
  },
]);
const exiting = ref(false);
const exitError = ref('');
const editing = ref(false);
const profileStatus = ref('');
function saved(user) {
  auth.setSession({ user });
  profile.value = user;
  editing.value = false;
  profileStatus.value = '个人资料已更新';
}
async function onSchoolEmailBound(updated) {
  auth.setSession({ user: updated });
  profile.value = updated;
  profileStatus.value = '学校邮箱绑定成功';
}
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
    <header class="profile-page__top">
      <h1>我的</h1>
      <RouterLink :to="{ name: 'inboxView' }" aria-label="消息信箱"
        ><AppIcon name="inbox"
      /></RouterLink>
    </header>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <template v-else-if="profile">
      <article class="profile-page__identity">
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
          <h2>{{ profile.displayName }}</h2>
          <span class="profile-page__role">{{ roleLabels[profile.role] }}</span>
          <p>认真吃饭，也认真生活</p>
        </div>
        <button
          class="profile-page__edit"
          type="button"
          aria-label="编辑资料"
          @click="
            editing = !editing;
            profileStatus = '';
          "
        >
          <AppIcon name="edit" />
        </button>
      </article>
      <div class="profile-page__follows" aria-label="关注统计">
        <RouterLink :to="{ name: 'myFollowing' }"
          ><strong>{{ profile.followingCount ?? 0 }}</strong
          ><span>关注</span></RouterLink
        >
        <RouterLink :to="{ name: 'myFollowers' }"
          ><strong>{{ profile.followerCount ?? 0 }}</strong
          ><span>粉丝</span></RouterLink
        >
      </div>
      <p v-if="profileStatus" role="status">{{ profileStatus }}</p>
      <ProfileEditor
        v-if="editing"
        :user="profile"
        @saved="saved"
        @cancel="editing = false"
      />
    </template>
    <nav class="profile-page__links" aria-label="个人功能">
      <section
        v-for="group in navigationGroups"
        :key="group.id"
        class="profile-page__group"
        :class="{ 'profile-page__group--list': group.id === 'account' }"
        :aria-labelledby="`profile-${group.id}`"
      >
        <h2 :id="`profile-${group.id}`">{{ group.title }}</h2>
        <div class="profile-page__entries">
          <RouterLink
            v-for="link in group.links"
            :key="link.label"
            :to="link.to"
            ><AppIcon :name="link.icon" /><span>{{ link.label }}</span
            ><span
              v-if="group.id === 'account'"
              class="profile-page__chevron"
              aria-hidden="true"
              >›</span
            ></RouterLink
          >
        </div>
        <AppearancePicker v-if="group.id === 'account'" />
      </section>
    </nav>
    <details v-if="showIosHomeGuide" class="profile-page__account-details">
      <summary>添加到主屏幕（苹果全屏 App 体验）</summary>
      <IosInstallSteps compact />
    </details>
    <details v-if="profile" class="profile-page__account-details">
      <summary>账号信息</summary>
      <p>{{ profile.email }}</p>
      <p>ID：{{ profile.id }}</p>
    </details>
    <details
      v-if="profile && !profile.schoolEmailVerified && !auth.isAdmin"
      class="profile-page__account-details"
    >
      <summary>学校邮箱认证</summary>
      <SchoolEmailBinder @bound="onSchoolEmailBound" />
    </details>
    <p v-if="exitError" role="alert">{{ exitError }}</p>
    <InkButton
      class="profile-page__logout"
      :disabled="exiting"
      @click="logout"
      >{{ exiting ? '退出中…' : '退出登录' }}</InkButton
    >
  </div>
</template>
<style scoped>
.profile-page {
  padding: 16px;
  max-width: 880px;
  margin: auto;
  overflow-wrap: anywhere;
}
.profile-page__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.profile-page__top h1 {
  font: 28px var(--ft-font-family-title);
  margin: 0;
}
.profile-page__top a,
.profile-page__edit {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border: 0;
  background: transparent;
  color: var(--ft-color-text);
  cursor: pointer;
}
.profile-page__top svg,
.profile-page__edit svg {
  width: 24px;
  height: 24px;
}
.profile-page__identity {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  padding: 18px 18px 14px;
  border: 1px solid var(--ft-border-subtle);
  border-bottom: 0;
  border-radius: var(--ft-radius-card) var(--ft-radius-card) 0 0;
  background: var(--zine-paper-card-alt);
}
.profile-page__avatar {
  flex: 0 0 68px;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--ft-color-primary);
}
.profile-page__avatar :deep(.media-image) {
  min-height: 0;
  height: 100%;
}
.profile-page__avatar :deep(span) {
  padding: 0;
  font: 28px var(--ft-font-family-title);
}
.profile-page__identity-copy {
  flex: 1;
  min-width: 0;
}
.profile-page__identity h2 {
  margin: 0 0 6px;
  font-size: 22px;
}
.profile-page__role {
  display: inline-block;
  padding: 2px 9px;
  border-radius: var(--ft-radius-pill);
  background: var(--zine-stamp-red-soft);
  font-size: 11px;
  font-weight: 700;
  color: var(--ft-color-primary);
}
.profile-page__identity p {
  margin: 6px 0 0;
  color: var(--ft-color-text-muted);
  font-size: 13px;
}
.profile-page__follows {
  display: flex;
  margin-bottom: 14px;
  padding: 10px 0 14px;
  border: 1px solid var(--ft-border-subtle);
  border-top: 1px solid var(--ft-border-subtle);
  border-radius: 0 0 var(--ft-radius-card) var(--ft-radius-card);
  background: var(--zine-paper-card-alt);
  box-shadow: var(--ft-shadow-card);
}
.profile-page__follows a {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-height: 44px;
}
.profile-page__follows a + a {
  border-left: 1px solid var(--ft-border-subtle);
}
.profile-page__follows strong {
  font-size: 20px;
}
.profile-page__follows span {
  color: var(--ft-color-text-muted);
  font-size: 12px;
}
.profile-page__group {
  margin-bottom: 12px;
  padding: 14px 14px 12px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-card);
  background: var(--zine-paper-card-alt);
  box-shadow: var(--ft-shadow-card);
}
.profile-page__group h2 {
  font: 700 16px/1.3 var(--ft-font-family-title);
  margin: 0 0 10px;
  padding: 0 2px;
}
.profile-page__entries {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.profile-page__entries a {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 10px 2px;
  min-height: 74px;
  font-size: 13px;
  text-align: center;
  border-radius: 12px;
  transition: background var(--ft-transition-fast);
}
.profile-page__entries svg {
  width: 26px;
  height: 26px;
  flex: none;
  color: var(--ft-color-primary);
}
.profile-page__entries a:hover {
  background: var(--zine-paper-card);
}
.profile-page__group--list .profile-page__entries {
  grid-template-columns: 1fr;
  gap: 0;
}
.profile-page__group--list a {
  flex-direction: row;
  gap: 12px;
  min-height: 48px;
  padding: 8px 6px;
  text-align: left;
  border-bottom: 1px solid var(--ft-border-subtle);
  border-radius: 0;
}
.profile-page__group--list a:last-child {
  border-bottom: 0;
}
.profile-page__group--list svg {
  width: 20px;
  height: 20px;
  color: var(--ft-color-text);
}
.profile-page__chevron {
  margin-left: auto;
  color: var(--ft-color-text-muted);
}
.profile-page__account-details {
  margin-bottom: 10px;
  padding: 0 14px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-card);
  background: var(--zine-paper-card-alt);
}
.profile-page__account-details summary {
  display: flex;
  align-items: center;
  min-height: 46px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
.profile-page__account-details p {
  font-size: 13px;
  color: var(--ft-color-text-muted);
}
.profile-page__logout {
  margin-top: 14px;
  width: 100%;
  color: var(--ft-color-danger);
  border-color: var(--ft-border-control);
}
@media (max-width: 360px) {
  .profile-page__entries {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .profile-page__avatar {
    flex-basis: 64px;
    width: 64px;
    height: 64px;
  }
}
</style>
