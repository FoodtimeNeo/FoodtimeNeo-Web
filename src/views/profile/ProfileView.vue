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
import SchoolEmailBinder from '@/components/profile/SchoolEmailBinder.vue';
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
const navigationGroups = computed(() =>
  [
    {
      id: 'saved',
      title: '收藏与回访',
      links: [
        {
          label: '想吃清单',
          hint: '收藏的菜品与分组',
          to: { name: 'favoriteDishes' },
        },
        {
          label: '帖子收藏',
          hint: '收藏的食记与分组',
          to: { name: 'community', query: { tab: 'favorites' } },
        },
        {
          label: '浏览历史',
          hint: '帖子与菜品分别查看',
          to: { name: 'browsingHistory' },
        },
      ],
    },
    {
      id: 'records',
      title: '我的记录',
      links: [
        {
          label: '我的食记',
          hint: '已发布、待审核与被拒的食记',
          to: { name: 'community', query: { tab: 'mine' } },
        },
        {
          label: '发帖草稿',
          hint: '继续编辑本机草稿',
          to: { name: 'community', query: { action: 'new' } },
        },
        { label: '菜品点评', hint: '已发布的点评', to: { name: 'myReviews' } },
        {
          label: '餐厅与档口点评',
          hint: '我的评价、回复与审核状态',
          to: { name: 'myVenueReviews' },
        },
        {
          label: '我的回复',
          hint: '楼内讨论与审核状态',
          to: { name: 'myReviewReplies' },
        },
        {
          label: '我的提交',
          hint: '投稿记录与审核结果',
          to: { name: 'mySubmissions' },
        },
      ],
    },
    {
      id: 'messages',
      title: '消息与处理',
      links: [
        {
          label: '消息信箱',
          hint: '公告与系统消息',
          to: { name: 'inboxView' },
        },
        {
          label: '建议与反馈',
          hint: '反馈记录与管理员回复',
          to: { name: 'myFeedback' },
        },
        {
          label: '目录纠错',
          hint: '名称、价格与介绍的更正进度',
          to: { name: 'myCorrections' },
        },
        {
          label: '举报与处理决定',
          hint: '举报进度、公开结果与申诉截止',
          to: { name: 'myReports' },
        },
      ],
    },
    {
      id: 'account',
      title: '账号与隐私',
      links: [
        {
          label: '黑名单',
          hint: '管理已屏蔽的用户',
          to: { name: 'myBlockedUsers' },
        },
        { label: '修改密码', hint: '', to: { name: 'changePassword' } },
        {
          label: '账号安全与注销',
          hint: '',
          to: { name: 'accountLifecycle' },
          adminHidden: true,
        },
      ],
    },
  ].map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.adminHidden || !auth.isAdmin),
  })),
);
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
        </div>
      </article>
      <div class="profile-page__meta">
        <span class="zine-chip">{{ profile.email }}</span>
        <span class="stamp">{{ roleLabels[profile.role] }}</span>
      </div>
      <details class="profile-page__account-details">
        <summary>账号信息</summary>
        <p class="profile-page__id">ID：{{ profile.id }}</p>
      </details>
      <details
        v-if="!profile.schoolEmailVerified && !auth.isAdmin"
        class="profile-page__binding"
      >
        <summary>学校邮箱 · 可选认证</summary>
        <SchoolEmailBinder @bound="onSchoolEmailBound" />
      </details>
      <div class="profile-page__follows" aria-label="关注统计">
        <RouterLink :to="{ name: 'myFollowing' }">
          <strong>{{ profile.followingCount ?? 0 }}</strong>
          <span>关注</span>
        </RouterLink>
        <RouterLink :to="{ name: 'myFollowers' }">
          <strong>{{ profile.followerCount ?? 0 }}</strong>
          <span>粉丝</span>
        </RouterLink>
      </div>
      <p v-if="profileStatus" role="status">{{ profileStatus }}</p>
      <ProfileEditor
        v-if="editing"
        :user="profile"
        @saved="saved"
        @cancel="editing = false"
      />
      <InkButton
        v-else
        type="button"
        @click="
          editing = true;
          profileStatus = '';
        "
        >编辑资料</InkButton
      >
    </template>
    <nav class="profile-page__links" aria-label="个人功能">
      <section
        v-for="group in navigationGroups"
        :key="group.id"
        class="profile-page__group"
        :aria-labelledby="`profile-${group.id}`"
      >
        <h2 :id="`profile-${group.id}`">{{ group.title }}</h2>
        <RouterLink
          v-for="link in group.links"
          :key="link.label"
          class="paper-link"
          :to="link.to"
        >
          <span
            >{{ link.label
            }}<small v-if="link.hint">{{ link.hint }}</small></span
          >
          <strong aria-hidden="true">→</strong>
        </RouterLink>
      </section>
    </nav>
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
  padding: var(--ft-space-3);
  max-width: 760px;
  margin: auto;
  overflow-wrap: anywhere;
}
.profile-page__follows {
  display: flex;
  gap: 12px;
  margin: 12px 0 20px;
}

.profile-page__follows a {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  border-radius: 999px;
  font-weight: 700;
}

.profile-page__follows strong {
  font-size: 20px;
  color: var(--zine-stamp-red);
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
.profile-page__account-details summary,
.profile-page__binding summary {
  display: flex;
  align-items: center;
  min-height: 44px;
  cursor: pointer;
  color: var(--ft-color-text-muted);
}
.profile-page__account-details summary::before,
.profile-page__binding summary::before {
  content: '＋';
  margin-right: 8px;
}
.profile-page__account-details[open] summary::before,
.profile-page__binding[open] summary::before {
  content: '−';
}
.profile-page__id {
  font-size: 14px;
}
.profile-page__links {
  display: grid;
  gap: 12px;
  margin: 24px 0;
}
.profile-page__group {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.profile-page__group h2 {
  margin: 0 0 2px;
  font-size: 20px;
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
