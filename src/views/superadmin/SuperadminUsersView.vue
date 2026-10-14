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
.search {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}
label {
  display: grid;
  gap: 8px;
}
.identity {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar {
  width: 64px;
  height: 64px;
  min-height: 64px;
  flex-shrink: 0;
}
article {
  padding: 20px;
  margin: 20px 0;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
input,
select,
button {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
button {
  margin: 8px 12px 0 0;
  cursor: pointer;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
