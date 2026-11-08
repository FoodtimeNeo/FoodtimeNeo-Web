<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { searchUsers } from '@/api/user-search.api.js';
import { followUser, unfollowUser } from '@/api/follow.api.js';
import { startConversation } from '@/api/directMessage.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useUserSearchStore } from '@/store/useUserSearchStore.js';
import BackLink from '@/components/base/BackLink.vue';
import MediaImage from '@/components/base/MediaImage.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const auth = useAuthStore();
const draft = useUserSearchStore();
draft.bind(auth.user);
const router = useRouter();
const query = ref(draft.query);
const submitted = ref('');
const inputError = ref('');
const pending = ref(null);
const rowErrors = reactive({});
const visitor = computed(() => auth.user?.role === 'visitor');
const state = usePagedData(
  (page, options) => searchUsers(submitted.value, page, options),
  { immediate: false },
);
let timer;
const empty = () => ({ items: [], total: 0, page: 1, size: 20 });

function submit() {
  window.clearTimeout(timer);
  const keyword = query.value.trim();
  if (keyword.length > 50) {
    inputError.value = '用户名关键词最多50个字符';
    return;
  }
  inputError.value = '';
  if (!keyword) {
    state.cancel();
    submitted.value = '';
    state.data.value = empty();
    state.hasLoaded.value = false;
    state.error.value = null;
    return;
  }
  if (
    keyword === submitted.value &&
    (state.loading.value || state.hasLoaded.value)
  )
    return;
  state.cancel();
  submitted.value = keyword;
  state.data.value = empty();
  state.hasLoaded.value = false;
  for (const id of Object.keys(rowErrors)) delete rowErrors[id];
  if (state.page.value === 1) state.load();
  else state.page.value = 1;
}

watch(query, (value) => {
  draft.query = value;
  window.clearTimeout(timer);
  // Invalidate immediately, even while the next debounced request has not started.
  state.cancel();
  submitted.value = '';
  state.data.value = empty();
  state.hasLoaded.value = false;
  state.error.value = null;
  if (!value.trim()) submit();
  else timer = window.setTimeout(submit, 300);
});
onMounted(() => {
  if (query.value.trim()) submit();
});
onUnmounted(() => window.clearTimeout(timer));

async function toggle(row) {
  if (pending.value || visitor.value) return;
  pending.value = { id: row.id, action: 'follow' };
  rowErrors[row.id] = '';
  try {
    const result = await (row.followedByMe
      ? unfollowUser(row.id)
      : followUser(row.id));
    state.data.value = {
      ...state.data.value,
      items: state.items.value.map((item) =>
        item.id === row.id ? { ...item, followedByMe: result.followed } : item,
      ),
    };
  } catch (failure) {
    rowErrors[row.id] = failure.message || '关注操作失败，请重试';
  } finally {
    pending.value = null;
  }
}

async function chat(row) {
  if (pending.value || visitor.value) return;
  pending.value = { id: row.id, action: 'chat' };
  rowErrors[row.id] = '';
  try {
    const conversation = await startConversation(row.id);
    await router.push({
      name: 'directChat',
      params: { conversationId: conversation.id },
    });
  } catch (failure) {
    rowErrors[row.id] = failure.message || '私信暂时无法打开，请重试';
  } finally {
    pending.value = null;
  }
}
</script>

<template>
  <main class="user-search">
    <BackLink />
    <h1 class="section-title">搜索<span class="zine-highlight">用户</span></h1>
    <form class="user-search__form" role="search" @submit.prevent="submit">
      <label for="user-search-query">用户名</label>
      <div class="user-search__input-row">
        <input
          id="user-search-query"
          v-model="query"
          type="search"
          maxlength="50"
          autocomplete="off"
          placeholder="输入同学的昵称"
          aria-describedby="user-search-hint"
          :aria-invalid="Boolean(inputError)"
        />
        <button type="submit" class="button-ink">搜索</button>
      </div>
      <p id="user-search-hint" class="user-search__hint">
        按昵称搜索，每行一位同学。
      </p>
      <p v-if="inputError" role="alert">{{ inputError }}</p>
    </form>
    <p v-if="visitor" class="user-search__hint">
      绑定学校邮箱后即可关注和私信。<RouterLink :to="{ name: 'profile' }"
        >去绑定</RouterLink
      >
    </p>
    <LoadingState v-if="state.initialLoading.value" message="正在查找同学…" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <EmptyState
      v-else-if="!submitted"
      title="想找哪位同学？"
      description="输入昵称，找到后可以关注或发私信。"
    />
    <template v-else-if="state.hasLoaded.value">
      <p class="user-search__hint" role="status">
        找到 {{ state.total.value }} 位同学
      </p>
      <EmptyState
        v-if="!state.items.value.length"
        title="没有找到匹配的用户"
        description="试试昵称中的其他关键词。"
      />
      <ul v-else class="user-search__list" aria-label="用户搜索结果">
        <li
          v-for="row in state.items.value"
          :key="row.id"
          class="user-search__person"
        >
          <span class="user-search__avatar"
            ><MediaImage
              compact
              :src="row.avatarUrl || ''"
              :alt="row.displayName"
              :empty="Array.from(row.displayName?.trim() || '饭')[0]"
          /></span>
          <span class="user-search__name">{{ row.displayName }}</span>
          <div class="user-search__actions">
            <button
              type="button"
              class="button-ink"
              :disabled="pending !== null || visitor"
              :aria-label="
                (row.followedByMe ? '取消关注' : '关注') + row.displayName
              "
              :aria-pressed="row.followedByMe"
              @click="toggle(row)"
            >
              {{
                pending?.id === row.id && pending.action === 'follow'
                  ? '处理中…'
                  : row.followedByMe
                    ? '已关注'
                    : '关注'
              }}
            </button>
            <button
              type="button"
              class="button-ink"
              :disabled="pending !== null || visitor"
              :aria-label="'私信' + row.displayName"
              @click="chat(row)"
            >
              {{
                pending?.id === row.id && pending.action === 'chat'
                  ? '打开中…'
                  : '私信'
              }}
            </button>
          </div>
          <p v-if="rowErrors[row.id]" class="user-search__error" role="alert">
            {{ rowErrors[row.id] }}
          </p>
        </li>
      </ul>
      <PaginationControls
        v-if="state.total.value > state.size.value"
        :page="state.page.value"
        :total="state.total.value"
        :size="state.size.value"
        :disabled="state.loading.value"
        @change="state.page.value = $event"
      />
    </template>
  </main>
</template>

<style scoped>
.user-search {
  max-width: 760px;
  margin: auto;
  padding: var(--ft-space-3);
  overflow-wrap: anywhere;
}
.user-search__form {
  margin: var(--ft-space-3) 0;
}
.user-search__form label {
  display: block;
  margin-bottom: var(--ft-space-1);
  font-weight: 700;
}
.user-search__input-row {
  display: flex;
  gap: var(--ft-space-1);
}
.user-search__input-row input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 10px 12px;
  font: inherit;
  color: var(--ft-color-text);
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-secondary);
}
.user-search__hint {
  font-size: var(--ft-font-size-sm);
  color: var(--ft-color-text-muted);
}
.user-search__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.user-search__person {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ft-space-1);
  padding: var(--ft-space-2) 0;
  border-bottom: 1px solid var(--ft-color-border);
}
.user-search__avatar {
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 50%;
}
.user-search__avatar :deep(.media-image) {
  min-height: 0;
}
.user-search__name {
  font-weight: 700;
}
.user-search__actions {
  display: flex;
  gap: var(--ft-space-1);
}
.user-search__actions button {
  min-height: 44px;
  padding: 8px 10px;
  white-space: nowrap;
}
.user-search__error {
  grid-column: 2 / -1;
  margin: 0;
  color: var(--zine-stamp-red);
}
input:focus-visible,
button:focus-visible {
  outline: 2px dashed var(--ft-color-primary);
  outline-offset: 3px;
}
@media (max-width: 768px) {
  .user-search__input-row input {
    font-size: 16px;
  }
}
</style>
