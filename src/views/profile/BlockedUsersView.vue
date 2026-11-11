<script setup>
import { onScopeDispose, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import { fetchBlockedUsers, setUserBlock } from '@/api/safety.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import BackLink from '@/components/base/BackLink.vue';
import MediaImage from '@/components/base/MediaImage.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const auth = useAuthStore();
const { data, items, page, total, size, error, loading, load, cancel } =
  usePagedData(
    (number, options) =>
      auth.user?.id
        ? fetchBlockedUsers(number, options)
        : Promise.resolve({ items: [], total: 0, page: 1, size: 20 }),
    { immediate: false },
  );
const actingId = ref(null);
const actionError = ref('');
const message = ref('');
let generation = 0;
watch(
  () => auth.user?.id,
  (owner) => {
    generation++;
    cancel();
    data.value = { items: [], total: 0, page: 1, size: 20 };
    actionError.value = '';
    message.value = '';
    actingId.value = null;
    const changed = page.value !== 1;
    page.value = 1;
    if (owner && !changed) load();
  },
  { immediate: true },
);
onScopeDispose(() => generation++);

async function unblock(row) {
  if (actingId.value || loading.value) return;
  const ticket = generation;
  actingId.value = row.id;
  actionError.value = '';
  message.value = '';
  try {
    await ElMessageBox.confirm(
      `解除对“${row.displayName || '该用户'}”的拉黑后，你们可以重新发送私信。`,
      '解除拉黑？',
      { confirmButtonText: '解除拉黑', cancelButtonText: '取消' },
    );
    if (ticket !== generation) return;
    await setUserBlock(row.id, false);
    if (ticket !== generation) return;
    message.value = '已解除拉黑';
    if (items.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (failure) {
    if (ticket === generation && !['cancel', 'close'].includes(failure))
      actionError.value = failure?.message || '解除失败，请重试';
  } finally {
    if (ticket === generation) actingId.value = null;
  }
}
</script>

<template>
  <div class="blocked-page">
    <BackLink />
    <h1 class="section-title"><span class="zine-highlight">黑名单</span></h1>
    <p>拉黑期间双方无法发送私信，已有会话记录会保留。</p>
    <button class="button-ink" :disabled="loading || !!actingId" @click="load">
      刷新列表
    </button>
    <p v-if="actionError" role="alert">{{ actionError }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState
      v-else-if="!items.length"
      title="黑名单为空"
      description="你还没有拉黑任何用户。"
    />
    <ul v-else class="blocked-page__list">
      <li v-for="row in items" :key="row.id">
        <div class="blocked-page__avatar">
          <MediaImage
            compact
            :src="row.avatarUrl || ''"
            :alt="row.displayName || '用户头像'"
            :empty="Array.from(row.displayName?.trim() || '饭')[0]"
          />
        </div>
        <span class="blocked-page__name">{{
          row.displayName || '校园干饭人'
        }}</span>
        <button class="button-ink" :disabled="!!actingId" @click="unblock(row)">
          {{ actingId === row.id ? '处理中…' : '解除拉黑' }}
        </button>
      </li>
    </ul>
    <PaginationControls
      v-if="page > 1 || total > size"
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || !!actingId"
      @change="page = $event"
    />
  </div>
</template>

<style scoped>
.blocked-page {
  max-width: 760px;
  margin: auto;
  padding: var(--ft-space-3);
  overflow-wrap: anywhere;
}
.blocked-page__list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}
.blocked-page__list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
}
.blocked-page__avatar {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 50%;
}
.blocked-page__avatar :deep(.media-image) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.blocked-page__name {
  flex: 1;
  min-width: 0;
}
.blocked-page__list button {
  flex: 0 0 auto;
}
</style>
