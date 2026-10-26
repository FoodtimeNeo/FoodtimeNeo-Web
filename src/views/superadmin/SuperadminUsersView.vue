<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchUsers, updateUserAccess } from '@/api/superadmin.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { roleLabels, statusLabels, formatTime } from '@/utils/recordLabels.js';
import MediaImage from '@/components/base/MediaImage.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
const auth = useAuthStore();
const draft = ref('');
const query = ref('');
const { items, page, total, size, loading, error, load } = usePagedData(
  (page, options) => fetchUsers(page, query.value, options),
);
const selected = ref(null);
const role = ref('user');
const status = ref('active');
const failure = ref('');
const notice = ref('');
const writing = ref(false);
function search() {
  if (writing.value) return;
  query.value = draft.value.trim();
  selected.value = null;
  if (page.value !== 1) page.value = 1;
  else load();
}
function edit(row) {
  selected.value = row;
  role.value = row.role;
  status.value = row.status;
  failure.value = '';
  notice.value = '';
}
async function submit() {
  if (writing.value || !selected.value || selected.value.id === auth.user?.id)
    return;
  writing.value = true;
  failure.value = '';
  try {
    await updateUserAccess(selected.value.id, {
      role: role.value,
      status: status.value,
    });
    selected.value = null;
    notice.value = '用户权限已更新';
    await load();
  } catch (error) {
    failure.value = error.message || '修改失败，请确认结果后再试';
  } finally {
    writing.value = false;
  }
}
</script>
<template>
  <section class="users">
    <h2 class="section-title">用户管理</h2>
    <form class="search" @submit.prevent="search">
      <label
        >搜索邮箱或昵称<input
          v-model="draft"
          type="search"
          maxlength="254"
          :disabled="writing" /></label
      ><button :disabled="writing">搜索</button>
    </form>
    <p v-if="notice" role="status">{{ notice }}</p>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState v-else-if="!items.length" title="没有找到用户" />
    <article v-for="row in !loading && !error ? items : []" :key="row.id">
      <div class="identity">
        <MediaImage
          compact
          :src="row.avatarUrl || ''"
          alt="用户头像"
          empty="未设置头像"
          class="avatar"
        />
        <h3>{{ row.displayName }}</h3>
      </div>
      <p>ID：{{ row.id }}</p>
      <p>{{ row.email }}</p>
      <p>{{ roleLabels[row.role] }} · {{ statusLabels[row.status] }}</p>
      <p>注册时间：{{ formatTime(row.createdAt) }}</p>
      <p>正式评论数：{{ row.reviewCount }}</p>
      <RouterLink :to="{ name: 'managedReviews', query: { q: row.id } }"
        >查看该用户评论</RouterLink
      >
      <p v-if="row.id === auth.user?.id">不能修改自己的角色或状态</p>
      <form v-if="selected?.id === row.id" @submit.prevent="submit">
        <label
          >角色<select v-model="role" :disabled="writing">
            <option v-for="(text, key) in roleLabels" :key="key" :value="key">
              {{ text }}
            </option>
          </select></label
        >
        <label
          >账号状态<select v-model="status" :disabled="writing">
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select></label
        >
        <p>角色或状态调整会影响该账号后续请求权限。</p>
        <p v-if="failure" role="alert">{{ failure }}</p>
        <button type="button" :disabled="writing" @click="selected = null">
          取消</button
        ><button type="submit" :disabled="writing">
          {{ writing ? '保存中…' : '确认修改' }}
        </button>
      </form>
      <button
        v-else
        :disabled="writing || row.id === auth.user?.id"
        @click="edit(row)"
      >
        编辑权限
      </button>
    </article>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || writing"
      @change="
        selected = null;
        page = $event;
      "
    />
  </section>
</template>
<style scoped>
.users {
  max-width: 1000px;
  margin: auto;
  overflow-wrap: anywhere;
}
.users > .section-title {
  margin-bottom: 14px;
}
.search {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
  padding: 14px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
}
label {
  display: grid;
  gap: 8px;
  color: var(--ft-color-text-muted);
}
.identity {
  display: flex;
  align-items: center;
  gap: 16px;
}
.identity h3 {
  margin: 0;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.08;
}
.avatar {
  width: 64px;
  height: 64px;
  min-height: 64px;
  flex-shrink: 0;
  border: 5px solid #fffaf0;
  box-shadow: 2px 3px 0 rgb(58 36 24 / 18%);
  transform: rotate(-2deg);
}
article {
  padding: 20px;
  margin: 20px 0;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
  clip-path: polygon(
    0 2%,
    7% 0,
    15% 2%,
    26% 0,
    38% 2%,
    52% 0,
    66% 2%,
    79% 0,
    91% 2%,
    100% 0,
    100% 100%,
    0 100%
  );
}
article:nth-of-type(even) {
  transform: rotate(0.35deg);
}
article:nth-of-type(odd) {
  transform: rotate(-0.25deg);
}
article > p {
  margin: 8px 0;
  color: var(--ft-color-text-muted);
}
input,
select,
button {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 0;
  background: #fffaf0;
}
button {
  margin: 8px 12px 0 0;
  box-shadow: 2px 2px 0 var(--ft-color-secondary);
  color: var(--ft-color-secondary);
  font-weight: 700;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--ft-color-secondary);
  color: #fffaf0;
  transform: translate(-1px, -1px);
}
form:not(.search) {
  margin-top: 16px;
  padding: 16px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
}
[role='status'] {
  display: inline-block;
  padding: 6px 12px;
  border: 2px solid var(--zine-stamp-blue);
  color: var(--zine-stamp-blue);
  font-family: var(--zine-handwriting-font);
  transform: rotate(-2deg);
}
[role='alert'] {
  color: var(--ft-color-danger);
  font-weight: 700;
}
@media (max-width: 560px) {
  article,
  article:nth-of-type(even),
  article:nth-of-type(odd) {
    padding: 16px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
  .search {
    display: grid;
    align-items: stretch;
  }
  .avatar {
    transform: none;
  }
}
</style>
