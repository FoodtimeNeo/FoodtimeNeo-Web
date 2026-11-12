<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  fetchDecisionActions,
  fetchMyModerationDecisions,
  submitAppeal,
} from '@/api/safety.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { formatTime } from '@/utils/recordLabels.js';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';

const router = useRouter();
const auth = useAuthStore();
const items = ref([]);
const loading = ref(true);
const error = ref('');
const drafts = reactive({});
const actionLists = reactive({});
const accountScope = computed(() =>
  auth.isRestricted && auth.user?.id
    ? JSON.stringify([window.location.origin, auth.user.id])
    : '',
);
let scopeController = new AbortController();
const labels = {
  upheld: '成立',
  not_upheld: '不成立',
  submitted: '已提交',
  under_review: '复核中',
  resolved: '已复核',
  reporter: '举报人',
  target: '被举报人',
};

function draftKey(decisionId) {
  return accountScope.value
    ? `foodtime:appeal-draft:v2:${accountScope.value}:${decisionId}`
    : '';
}

function readDraft(key) {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function draftFor(decision) {
  if (!drafts[decision.decisionId]) {
    const saved = readDraft(draftKey(decision.decisionId));
    drafts[decision.decisionId] = {
      content: saved?.content || '',
      requestId: saved?.requestId || crypto.randomUUID(),
      error: '',
      submitting: false,
    };
  }
  return drafts[decision.decisionId];
}

function saveDraft(decision) {
  const key = draftKey(decision.decisionId);
  if (!key) return;
  const draft = draftFor(decision);
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ content: draft.content, requestId: draft.requestId }),
    );
  } catch {
    // Draft persistence is best-effort; the form still works in this page.
  }
}

function clearDraft(key) {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

async function loadActions(decision) {
  const key = decision.decisionId;
  if (actionLists[key]) {
    actionLists[key].open = !actionLists[key].open;
    if (!actionLists[key].open || !actionLists[key].error) return;
  }
  const state = reactive({ open: true, loading: true, items: [], error: '' });
  actionLists[key] = state;
  const signal = scopeController.signal;
  try {
    const data = await fetchDecisionActions(key, { signal });
    if (!signal.aborted) state.items = data;
  } catch (failure) {
    if (!signal.aborted) state.error = failure.message || '无法读取处理动作';
  } finally {
    if (!signal.aborted) state.loading = false;
  }
}

function canAppeal(decision) {
  return (
    !decision.appealStatus && Date.parse(decision.appealDeadline) > Date.now()
  );
}

async function load() {
  const signal = scopeController.signal;
  if (!accountScope.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const data = await fetchMyModerationDecisions(1, { signal });
    if (!signal.aborted) items.value = data.items;
  } catch (failure) {
    if (!signal.aborted) error.value = failure.message || '无法读取处理决定';
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

async function submit(decision) {
  const key = draftKey(decision.decisionId);
  if (!key) return;
  const signal = scopeController.signal;
  const draft = draftFor(decision);
  if (draft.submitting) return;
  if (!draft.content.trim()) {
    draft.error = '请填写申诉内容';
    return;
  }
  draft.submitting = true;
  draft.error = '';
  saveDraft(decision);
  try {
    const created = await submitAppeal(
      decision.decisionId,
      {
        content: draft.content.trim(),
        evidenceUrls: [],
        clientRequestId: draft.requestId,
      },
      { signal },
    );
    if (signal.aborted) return;
    decision.appealId = created.id;
    decision.appealStatus = created.status;
    clearDraft(key);
    ElMessage.success('申诉已提交');
  } catch (failure) {
    if (!signal.aborted) draft.error = failure.message || '申诉提交失败';
  } finally {
    draft.submitting = false;
  }
}

async function logout() {
  await auth.logout();
  await router.replace({ name: 'login' });
}

watch(
  accountScope,
  () => {
    scopeController.abort();
    scopeController = new AbortController();
    items.value = [];
    error.value = '';
    for (const key of Object.keys(drafts)) delete drafts[key];
    for (const key of Object.keys(actionLists)) delete actionLists[key];
    load();
  },
  { immediate: true, flush: 'sync' },
);
onBeforeUnmount(() => scopeController.abort());
</script>

<template>
  <main class="appeal-only">
    <header class="appeal-only__header">
      <div>
        <span class="stamp">受限申诉</span>
        <h1>处理决定与申诉</h1>
      </div>
      <button type="button" class="button-ink" @click="logout">退出登录</button>
    </header>
    <p class="appeal-only__hint">
      当前账号已停用，本页面只允许查看本人的处理决定和提交一次申诉。会话在登录后
      45 分钟到期；未提交的申诉内容会在重新登录后恢复。
    </p>
    <p v-if="auth.user?.email" class="appeal-only__account">
      账号：{{ auth.user.email }}
    </p>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error" @retry="load" />
    <p v-else-if="!items.length">当前没有可查看的处理决定。</p>
    <ul v-else class="appeal-only__list">
      <li v-for="item in items" :key="item.decisionId">
        <header>
          <strong>处理结果：{{ labels[item.outcome] || item.outcome }}</strong>
          <span>{{ labels[item.side] || item.side }}</span>
        </header>
        <p>公开理由：{{ item.publicReason }}</p>
        <p>入箱时间：{{ formatTime(item.deliveredAt) }}</p>
        <p>申诉截止：{{ formatTime(item.appealDeadline) }}</p>
        <button
          type="button"
          class="appeal-only__toggle"
          @click="loadActions(item)"
        >
          {{
            actionLists[item.decisionId]?.open ? '收起处理动作' : '查看处理动作'
          }}
        </button>
        <div
          v-if="actionLists[item.decisionId]?.open"
          class="appeal-only__actions"
        >
          <p v-if="actionLists[item.decisionId].loading">正在读取…</p>
          <p v-else-if="actionLists[item.decisionId].error" role="alert">
            {{ actionLists[item.decisionId].error }}
          </p>
          <p v-else-if="!actionLists[item.decisionId].items.length">
            尚未记录实际处理动作。
          </p>
          <ul v-else>
            <li
              v-for="action in actionLists[item.decisionId].items"
              :key="action.id"
            >
              {{ action.actionType }} · {{ action.targetType }} ·
              {{ formatTime(action.createdAt) }}
            </li>
          </ul>
        </div>
        <p v-if="item.appealStatus">
          你的申诉：{{ labels[item.appealStatus] || item.appealStatus }}
          <span v-if="item.appealOutcome">
            · {{ labels[item.appealOutcome] || item.appealOutcome }}
          </span>
        </p>
        <template v-else-if="canAppeal(item)">
          <label>
            申诉内容（最多 2000 字）
            <textarea
              v-model="draftFor(item).content"
              rows="6"
              maxlength="2000"
              @input="saveDraft(item)"
            ></textarea>
          </label>
          <p v-if="draftFor(item).error" role="alert">
            {{ draftFor(item).error }}
          </p>
          <button
            type="button"
            class="button-ink is-primary"
            :disabled="draftFor(item).submitting"
            @click="submit(item)"
          >
            提交申诉
          </button>
        </template>
        <p v-else>申诉期限已过或已提交。</p>
      </li>
    </ul>
  </main>
</template>

<style scoped lang="scss">
.appeal-only {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 760px);
  margin: var(--ft-space-6) auto;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    h1 {
      margin: 8px 0 0;
    }
  }

  &__hint {
    padding: 10px;
    border: 1px solid var(--ft-color-secondary);
    background: var(--ft-color-surface);
    color: var(--ft-color-text-muted);
  }

  &__account {
    font-size: var(--ft-font-size-sm);
  }

  &__toggle {
    margin-top: 10px;
    border: 0;
    background: transparent;
    color: var(--ft-color-primary);
    cursor: pointer;
  }

  &__actions {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--ft-color-secondary);
    font-size: var(--ft-font-size-sm);
  }

  &__list {
    display: grid;
    gap: 12px;
    padding: 0;
    list-style: none;

    li {
      padding: 14px;
      border: 1px solid var(--ft-color-secondary);
      background: var(--ft-color-surface);
      overflow-wrap: anywhere;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      margin: 6px 0;
      padding: 8px;
    }
  }
}
</style>
