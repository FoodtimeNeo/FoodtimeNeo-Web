<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  clearBrowsingHistory,
  deleteBrowsingHistory,
  fetchBrowsingHistory,
} from '@/api/browsingHistory.api.js';
import { useBrowsingHistoryStore } from '@/store/useBrowsingHistoryStore.js';
import { formatTime } from '@/utils/recordLabels.js';
import BackLink from '@/components/base/BackLink.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const router = useRouter();
const history = useBrowsingHistoryStore();
const kind = ref('dish');
const items = ref([]);
const total = ref(0);
const page = ref(1);
const size = ref(50);
const loading = ref(false);
const error = ref('');
const settingsError = ref('');
const saving = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await fetchBrowsingHistory(kind.value, {
      page: page.value,
      size: size.value,
    });
    items.value = data.items;
    total.value = data.total;
  } catch (requestError) {
    error.value = requestError.message || '无法读取浏览历史';
  } finally {
    loading.value = false;
  }
}

async function loadSettings() {
  settingsError.value = '';
  try {
    await history.refresh();
  } catch (requestError) {
    settingsError.value = requestError.message || '无法读取历史设置';
  }
}

async function toggleEnabled(event) {
  saving.value = true;
  settingsError.value = '';
  try {
    await history.updateEnabled(event.target.checked);
    ElMessage.success(event.target.checked ? '已开启记录' : '已关闭记录');
  } catch (requestError) {
    event.target.checked = history.enabled;
    settingsError.value = requestError.message || '保存失败';
  } finally {
    saving.value = false;
  }
}

async function remove(item) {
  if (
    !window.confirm(
      item.available
        ? `删除「${item.title}」的浏览记录？`
        : '删除这条失效的浏览记录？',
    )
  )
    return;
  try {
    await deleteBrowsingHistory(kind.value, item.targetId);
    await loadSettings();
    await load();
  } catch (requestError) {
    error.value = requestError.message || '删除失败';
  }
}

async function clearKind() {
  try {
    await ElMessageBox.confirm(
      `清空全部${kind.value === 'dish' ? '菜品' : '帖子'}浏览历史？另一类不受影响。`,
      '清空浏览历史',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await clearBrowsingHistory(kind.value);
    await loadSettings();
    await load();
  } catch (requestError) {
    error.value = requestError.message || '清空失败';
  }
}

function open(item) {
  if (!item.available) return;
  if (item.kind === 'post') {
    router.push({ name: 'communityDetail', params: { postId: item.targetId } });
  } else if (item.diningHallId && item.stallId) {
    router.push({
      name: 'dishDetail',
      params: {
        canteenId: item.diningHallId,
        stallId: item.stallId,
        dishId: item.targetId,
      },
    });
  }
}

watch(kind, () => {
  page.value = 1;
  load();
});
onMounted(() => {
  loadSettings();
  load();
});
</script>

<template>
  <main class="browsing-history">
    <BackLink />
    <h1 class="section-title">浏览历史</h1>
    <label class="browsing-history__toggle">
      <input
        type="checkbox"
        :checked="history.enabled"
        :disabled="saving || !history.loaded"
        @change="toggleEnabled"
      />
      记录浏览历史
    </label>
    <p class="browsing-history__hint">
      关闭只停止新增，已有记录保留；帖子和菜品分别保存最近 50 条。
    </p>
    <p v-if="settingsError" role="alert">{{ settingsError }}</p>

    <div class="browsing-history__tabs" role="tablist">
      <button
        type="button"
        :class="{ 'is-active': kind === 'dish' }"
        @click="kind = 'dish'"
      >
        菜品
      </button>
      <button
        type="button"
        :class="{ 'is-active': kind === 'post' }"
        @click="kind = 'post'"
      >
        帖子
      </button>
      <button type="button" class="is-danger" @click="clearKind">
        清空{{ kind === 'dish' ? '菜品' : '帖子' }}
      </button>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error" @retry="load" />
    <EmptyState v-else-if="!items.length" title="还没有浏览记录" />
    <ul v-else class="browsing-history__list">
      <li v-for="item in items" :key="`${item.kind}:${item.targetId}`">
        <button type="button" :disabled="!item.available" @click="open(item)">
          <img v-if="item.imageUrl" :src="item.imageUrl" alt="" />
          <span class="browsing-history__body">
            <strong>{{ item.available ? item.title : '内容已失效' }}</strong>
            <small>{{
              item.available ? item.subtitle : '可删除这条记录'
            }}</small>
            <small>{{ formatTime(item.visitedAt) }}</small>
          </span>
        </button>
        <button
          type="button"
          class="browsing-history__remove"
          @click="remove(item)"
        >
          删除
        </button>
      </li>
    </ul>
    <PaginationControls
      v-if="total > size"
      :page="page"
      :total="total"
      :size="size"
      @change="
        page = $event;
        load();
      "
    />
  </main>
</template>

<style scoped lang="scss">
.browsing-history {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 720px);
  margin: var(--ft-space-6) auto;

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
  }

  &__hint {
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }

  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 14px 0;

    button {
      padding: 8px 12px;
      border: 1px solid var(--ft-color-secondary);
      background: transparent;
      cursor: pointer;
    }

    button.is-active {
      border-color: var(--ft-color-primary);
      background: rgb(201 52 30 / 10%);
    }

    button.is-danger {
      margin-left: auto;
      color: var(--ft-color-danger);
    }
  }

  &__list {
    display: grid;
    gap: 10px;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      align-items: stretch;
      gap: 6px;
      border: 1px solid var(--ft-color-secondary);
      background: var(--ft-color-surface);
    }

    li > button:first-child {
      display: flex;
      flex: 1;
      gap: 10px;
      padding: 10px;
      border: 0;
      background: transparent;
      text-align: left;
      cursor: pointer;
    }

    li > button:disabled {
      cursor: default;
      opacity: 0.7;
    }

    img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      flex: none;
    }
  }

  &__body {
    display: grid;
    gap: 3px;
    min-width: 0;

    strong,
    small {
      overflow-wrap: anywhere;
    }

    small {
      color: var(--ft-color-text-muted);
    }
  }

  &__remove {
    align-self: center;
    margin-right: 8px;
    border: 0;
    background: transparent;
    color: var(--ft-color-danger);
    cursor: pointer;
  }
}
</style>
