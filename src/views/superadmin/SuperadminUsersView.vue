<script setup>
import { computed, ref, watch } from 'vue';
import {
  fetchUsers,
  updateUserRole,
  updateUserStatus,
  resetUserPassword,
  fetchInviteCode,
  generateInviteCode,
} from '@/api/superadmin.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import InkButton from '@/components/base/InkButton.vue';

const auth = useAuthStore();
const searchInput = ref('');
const search = ref('');
const page = ref(1);
const perPage = 20;
const users = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref(null);
const busyId = ref('');
const passwordId = ref('');
const password = ref('');
const actionError = ref('');
const notice = ref('');
const inviteCode = ref(null);
const inviteLoading = ref(false);
const inviteError = ref(null);
const inviteBusy = ref(false);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / perPage)),
);
let requestId = 0;

async function loadUsers() {
  const currentRequest = ++requestId;
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchUsers(page.value, search.value, perPage);
    if (currentRequest !== requestId) return;
    users.value = Array.isArray(data?.items) ? data.items : [];
    total.value = Math.max(0, Number(data?.total) || 0);
  } catch (caught) {
    if (currentRequest === requestId) error.value = caught;
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

function submitSearch() {
  const nextSearch = searchInput.value.trim();
  if (page.value === 1 && search.value === nextSearch) {
    loadUsers();
  } else {
    search.value = nextSearch;
    page.value = 1;
  }
}

async function runAction(user, message, action, successMessage) {
  if (busyId.value || !window.confirm(message)) return false;
  busyId.value = String(user.id);
  actionError.value = '';
  notice.value = '';
  try {
    await action();
    notice.value = successMessage;
    await loadUsers();
    return true;
  } catch (caught) {
    actionError.value = caught.message || '操作失败，请稍后重试。';
    return false;
  } finally {
    busyId.value = '';
  }
}

async function changeRole(user, event) {
  const role = event.target.value;
  event.target.value = user.role;
  if (String(user.id) === String(auth.user?.id) || role === user.role) return;
  await runAction(
    user,
    `确定将 ${user.account} 的角色改为 ${role} 吗？`,
    () => updateUserRole(user.id, role),
    '角色已更新。',
  );
}

async function toggleStatus(user) {
  const status = user.account_status === 'banned' ? 'active' : 'banned';
  await runAction(
    user,
    `确定${status === 'banned' ? '封禁' : '解封'} ${user.account} 吗？`,
    () => updateUserStatus(user.id, status),
    '账号状态已更新。',
  );
}

async function submitPassword(user) {
  if (password.value.length < 6 || password.value.length > 128) {
    actionError.value = '新密码长度须为 6–128 位。';
    return;
  }
  const changed = await runAction(
    user,
    `确定重置 ${user.account} 的密码吗？此操作会立即生效。`,
    () => resetUserPassword(user.id, password.value),
    '密码已重置，请安全告知该用户。',
  );
  if (changed) {
    password.value = '';
    passwordId.value = '';
  }
}

async function loadInviteCode() {
  inviteLoading.value = true;
  inviteError.value = null;
  try {
    inviteCode.value = await fetchInviteCode();
  } catch (caught) {
    inviteError.value = caught;
  } finally {
    inviteLoading.value = false;
  }
}

async function createInviteCode() {
  if (inviteBusy.value) return;
  inviteBusy.value = true;
  inviteError.value = null;
  try {
    inviteCode.value = await generateInviteCode();
  } catch (caught) {
    inviteError.value = caught;
  } finally {
    inviteBusy.value = false;
  }
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

watch([page, search], loadUsers, { immediate: true });
loadInviteCode();
</script>

<template>
  <div class="users-page">
    <section aria-labelledby="users-title">
      <div class="users-page__heading">
        <div>
          <h2 id="users-title">用户管理</h2>
          <p>共 {{ total }} 位用户；修改角色、状态和密码前均需确认。</p>
        </div>
        <InkButton :disabled="loading" @click="loadUsers">刷新用户</InkButton>
      </div>
      <form class="users-page__search" @submit.prevent="submitSearch">
        <label for="user-search">搜索账号、昵称或邮箱</label>
        <input id="user-search" v-model="searchInput" type="search" />
        <InkButton type="submit">搜索</InkButton>
      </form>
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="actionError" role="alert">{{ actionError }}</p>
      <LoadingState v-if="loading" message="正在读取用户…" />
      <ErrorState
        v-else-if="error"
        :description="error.message"
        @retry="loadUsers"
      />
      <EmptyState v-else-if="!users.length" title="没有找到用户" />
      <ul v-else class="users-page__list">
        <li v-for="user in users" :key="user.id" class="users-page__card">
          <div>
            <strong>{{ user.account }}</strong>
            <p>{{ user.nickname }} · {{ user.email || '无邮箱' }}</p>
            <small>注册于 {{ formatTime(user.created_at) }}</small>
          </div>
          <div class="users-page__actions">
            <label :for="`role-${user.id}`">角色</label>
            <select
              :id="`role-${user.id}`"
              :value="user.role"
              :disabled="
                busyId !== '' || String(user.id) === String(auth.user?.id)
              "
              @change="changeRole(user, $event)"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
              <option value="superadmin">超级管理员</option>
            </select>
            <span v-if="String(user.id) === String(auth.user?.id)"
              >不能修改自己的角色</span
            >
            <span
              >状态：{{
                user.account_status === 'banned' ? '封禁' : '正常'
              }}</span
            >
            <InkButton :disabled="busyId !== ''" @click="toggleStatus(user)">
              {{ user.account_status === 'banned' ? '解封' : '封禁' }}
            </InkButton>
            <InkButton
              :disabled="busyId !== ''"
              @click="
                passwordId = passwordId === user.id ? '' : user.id;
                password = '';
              "
              >重置密码</InkButton
            >
          </div>
          <form
            v-if="passwordId === user.id"
            class="users-page__password"
            @submit.prevent="submitPassword(user)"
          >
            <label :for="`password-${user.id}`">新密码（6–128 位）</label>
            <input
              :id="`password-${user.id}`"
              v-model="password"
              type="password"
              minlength="6"
              maxlength="128"
              autocomplete="new-password"
              required
            />
            <InkButton type="submit" :disabled="busyId !== ''"
              >确认重置</InkButton
            >
          </form>
        </li>
      </ul>
      <nav class="users-page__pagination" aria-label="用户分页">
        <InkButton :disabled="loading || page <= 1" @click="page -= 1"
          >上一页</InkButton
        >
        <span>第 {{ page }} / {{ totalPages }} 页</span>
        <InkButton :disabled="loading || page >= totalPages" @click="page += 1"
          >下一页</InkButton
        >
      </nav>
    </section>

    <section aria-labelledby="invite-title">
      <div class="users-page__heading">
        <div>
          <h2 id="invite-title">我的管理员邀请码</h2>
          <p>
            现有接口仅提供当前账号的有效邀请码；生成时若已有有效码，会返回同一邀请码。
          </p>
        </div>
        <InkButton
          :disabled="inviteLoading || inviteBusy"
          @click="createInviteCode"
          >获取或生成邀请码</InkButton
        >
      </div>
      <LoadingState
        v-if="inviteLoading || inviteBusy"
        message="正在读取邀请码…"
      />
      <ErrorState
        v-else-if="inviteError"
        :description="inviteError.message"
        @retry="loadInviteCode"
      />
      <EmptyState v-else-if="!inviteCode" title="暂无有效邀请码" />
      <div v-else class="users-page__invite">
        <strong>{{ inviteCode.code }}</strong>
        <span>有效期至 {{ formatTime(inviteCode.expires_at) }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.users-page {
  display: grid;
  gap: var(--ft-space-5);

  &__heading,
  &__search,
  &__actions,
  &__password,
  &__pagination,
  &__invite {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ft-space-2);
  }

  h2 {
    margin: 0;
    font-family: var(--ft-font-family-title);
  }
  p,
  small {
    color: var(--ft-color-text-muted);
  }
  &__heading {
    justify-content: space-between;
  }
  &__search {
    margin: var(--ft-space-3) 0;
  }
  &__list {
    display: grid;
    gap: var(--ft-space-2);
    padding: 0;
    list-style: none;
  }
  &__card,
  &__invite {
    padding: var(--ft-space-2);
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card-alt);
    box-shadow: 4px 4px 0 var(--ft-color-text);
  }
  &__card {
    display: grid;
    gap: var(--ft-space-2);
  }
  &__card p {
    margin: var(--ft-space-1) 0;
  }
  &__password {
    border-top: 1px solid var(--ft-color-text);
    padding-top: var(--ft-space-2);
  }
  &__pagination {
    justify-content: flex-end;
  }
  input,
  select {
    min-height: 44px;
    padding: 8px;
    border: 2px solid var(--ft-color-text);
  }
  [role='alert'] {
    color: var(--ft-color-danger);
  }
}
</style>
