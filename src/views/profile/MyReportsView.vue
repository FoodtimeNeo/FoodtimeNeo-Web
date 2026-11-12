<script setup>
import { reactive, ref } from 'vue';
import {
  addReportFollowUp,
  fetchDecisionActions,
  fetchMyModerationDecisions,
  fetchMyReports,
  fetchReportFollowUps,
  submitAppeal,
} from '@/api/safety.api.js';
import { uploadImage } from '@/api/submission.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import BackLink from '@/components/base/BackLink.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const tab = ref('reports');
const reports = usePagedData(fetchMyReports);
const decisions = usePagedData(fetchMyModerationDecisions);
const threads = reactive({});
const appeals = reactive({});
const actionLists = reactive({});
const labels = {
  post: '食记',
  comment: '评论',
  message: '私信',
  upheld: '成立',
  not_upheld: '不成立',
  pending: '待处理',
  completed: '已完成',
  legacy: '历史记录，未提供详细结果',
  submitted: '已提交',
  under_review: '复核中',
  resolved: '已复核',
};

function switchTab(value) {
  tab.value = value;
  if (value === 'reports' && !reports.items.value.length) reports.load();
  if (value === 'decisions' && !decisions.items.value.length) decisions.load();
}

function threadFor(report) {
  if (!threads[report.id])
    threads[report.id] = {
      open: false,
      items: [],
      loading: false,
      content: '',
      evidence: [],
      uploading: false,
      error: '',
      requestId: crypto.randomUUID(),
    };
  return threads[report.id];
}

async function toggleThread(report) {
  const thread = threadFor(report);
  thread.open = !thread.open;
  if (!thread.open || thread.items.length) return;
  thread.loading = true;
  thread.error = '';
  try {
    const data = await fetchReportFollowUps(report.id);
    thread.items = data.items;
  } catch (error) {
    thread.error = error.message || '无法读取追问记录';
  } finally {
    thread.loading = false;
  }
}

async function addEvidence(state, event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;
  if (state.evidence.length + files.length > 3) {
    state.error = '证据图片最多3张';
    return;
  }
  state.uploading = true;
  state.error = '';
  try {
    for (const file of files) {
      const uploaded = await uploadImage(file);
      state.evidence.push({ url: uploaded.imageUrl, name: file.name });
    }
  } catch (error) {
    state.error = error.message || '证据上传失败';
  } finally {
    state.uploading = false;
  }
}

function removeEvidence(state, index) {
  state.evidence.splice(index, 1);
}

async function sendFollowUp(report) {
  const thread = threadFor(report);
  if (!thread.content.trim()) {
    thread.error = '请填写追问内容';
    return;
  }
  thread.loading = true;
  thread.error = '';
  try {
    const created = await addReportFollowUp(report.id, {
      content: thread.content.trim(),
      evidenceUrls: thread.evidence.map((item) => item.url),
      clientRequestId: thread.requestId,
    });
    thread.items.push(created);
    thread.content = '';
    thread.evidence = [];
    thread.requestId = crypto.randomUUID();
  } catch (error) {
    thread.error = error.message || '追问提交失败';
  } finally {
    thread.loading = false;
  }
}

function appealFor(decision) {
  if (!appeals[decision.decisionId])
    appeals[decision.decisionId] = {
      content: '',
      evidence: [],
      uploading: false,
      error: '',
      submitting: false,
      requestId: crypto.randomUUID(),
    };
  return appeals[decision.decisionId];
}

async function loadActions(decision) {
  const key = decision.decisionId;
  if (actionLists[key]) {
    actionLists[key].open = !actionLists[key].open;
    return;
  }
  actionLists[key] = { open: true, loading: true, items: [], error: '' };
  try {
    actionLists[key].items = await fetchDecisionActions(key);
  } catch (error) {
    actionLists[key].error = error.message || '无法读取处理动作';
  } finally {
    actionLists[key].loading = false;
  }
}

function canAppeal(decision) {
  return (
    !decision.appealStatus && Date.parse(decision.appealDeadline) > Date.now()
  );
}

async function sendAppeal(decision) {
  const draft = appealFor(decision);
  if (!draft.content.trim()) {
    draft.error = '请填写申诉内容';
    return;
  }
  draft.submitting = true;
  draft.error = '';
  try {
    const created = await submitAppeal(decision.decisionId, {
      content: draft.content.trim(),
      evidenceUrls: draft.evidence.map((item) => item.url),
      clientRequestId: draft.requestId,
    });
    decision.appealId = created.id;
    decision.appealStatus = created.status;
    draft.content = '';
    draft.evidence = [];
    draft.requestId = crypto.randomUUID();
  } catch (error) {
    draft.error = error.message || '申诉提交失败';
  } finally {
    draft.submitting = false;
  }
}
</script>

<template>
  <main class="my-reports">
    <BackLink />
    <h1 class="section-title">举报与处理决定</h1>
    <div class="my-reports__tabs" role="tablist">
      <button
        type="button"
        :class="{ 'is-active': tab === 'reports' }"
        @click="switchTab('reports')"
      >
        我的举报
      </button>
      <button
        type="button"
        :class="{ 'is-active': tab === 'decisions' }"
        @click="switchTab('decisions')"
      >
        收到的决定
      </button>
    </div>

    <template v-if="tab === 'reports'">
      <LoadingState v-if="reports.loading.value" />
      <ErrorState
        v-else-if="reports.error.value"
        :description="reports.error.value.message"
        @retry="reports.load"
      />
      <EmptyState
        v-else-if="!reports.items.value.length"
        title="还没有举报记录"
      />
      <ul v-else class="my-reports__list">
        <li v-for="item in reports.items.value" :key="item.id">
          <header>
            <strong>{{ labels[item.targetType] || item.targetType }}</strong>
            <span>{{ labels[item.status] || item.status }}</span>
          </header>
          <p>举报理由：{{ item.reason }}</p>
          <blockquote>{{ item.excerpt }}</blockquote>
          <p>{{ formatTime(item.createdAt) }}</p>
          <div v-if="item.outcome" class="my-reports__decision">
            <strong
              >处理结果：{{ labels[item.outcome] || item.outcome }}</strong
            >
            <p>公开理由：{{ item.publicReason }}</p>
            <small>{{ formatTime(item.decidedAt) }}</small>
          </div>
          <button
            type="button"
            class="my-reports__toggle"
            @click="toggleThread(item)"
          >
            {{ threadFor(item).open ? '收起追问' : '追问记录' }}
          </button>
          <div v-if="threadFor(item).open" class="my-reports__thread">
            <p v-if="threadFor(item).loading">正在读取…</p>
            <ul>
              <li v-for="reply in threadFor(item).items" :key="reply.id">
                <strong>{{
                  reply.authorRole === 'staff' ? '管理员回复' : '我'
                }}</strong>
                <p>{{ reply.content }}</p>
                <small>{{ formatTime(reply.createdAt) }}</small>
              </li>
            </ul>
            <p v-if="threadFor(item).error" role="alert">
              {{ threadFor(item).error }}
            </p>
            <textarea
              v-model="threadFor(item).content"
              rows="2"
              maxlength="500"
              placeholder="追加追问或材料说明"
            ></textarea>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              :disabled="
                threadFor(item).uploading ||
                threadFor(item).evidence.length >= 3
              "
              @change="addEvidence(threadFor(item), $event)"
            />
            <p v-if="threadFor(item).uploading">正在上传证据…</p>
            <ul
              v-if="threadFor(item).evidence.length"
              class="my-reports__evidence"
            >
              <li
                v-for="(file, index) in threadFor(item).evidence"
                :key="file.url"
              >
                <img :src="file.url" :alt="file.name" />
                <button
                  type="button"
                  @click="removeEvidence(threadFor(item), index)"
                >
                  移除
                </button>
              </li>
            </ul>
            <button
              type="button"
              class="button-ink"
              :disabled="threadFor(item).loading || threadFor(item).uploading"
              @click="sendFollowUp(item)"
            >
              提交追问
            </button>
          </div>
        </li>
      </ul>
      <PaginationControls
        v-if="reports.total.value > reports.size.value"
        :page="reports.page.value"
        :total="reports.total.value"
        :size="reports.size.value"
        @change="reports.page.value = $event"
      />
    </template>

    <template v-else>
      <LoadingState v-if="decisions.loading.value" />
      <ErrorState
        v-else-if="decisions.error.value"
        :description="decisions.error.value.message"
        @retry="decisions.load"
      />
      <EmptyState
        v-else-if="!decisions.items.value.length"
        title="还没有收到的处理决定"
      />
      <ul v-else class="my-reports__list">
        <li v-for="item in decisions.items.value" :key="item.decisionId">
          <header>
            <strong>{{ labels[item.targetType] || item.targetType }}</strong>
            <span>{{ labels[item.outcome] || item.outcome }}</span>
          </header>
          <p>公开理由：{{ item.publicReason }}</p>
          <p>入箱时间：{{ formatTime(item.deliveredAt) }}</p>
          <p>申诉截止：{{ formatTime(item.appealDeadline) }}</p>
          <small
            >当前身份：{{
              item.side === 'reporter' ? '举报人' : '被举报人'
            }}</small
          >
          <button
            type="button"
            class="my-reports__toggle"
            @click="loadActions(item)"
          >
            {{
              actionLists[item.decisionId]?.open
                ? '收起处理动作'
                : '查看处理动作'
            }}
          </button>
          <div
            v-if="actionLists[item.decisionId]?.open"
            class="my-reports__actions"
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
                <span v-if="action.note"> · {{ action.note }}</span>
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
            <div class="my-reports__appeal">
              <p>可在截止前提交一次申诉：</p>
              <textarea
                v-model="appealFor(item).content"
                rows="3"
                maxlength="2000"
                placeholder="申诉理由，最多2000字"
              ></textarea>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                :disabled="
                  appealFor(item).uploading ||
                  appealFor(item).evidence.length >= 3
                "
                @change="addEvidence(appealFor(item), $event)"
              />
              <p v-if="appealFor(item).uploading">正在上传证据…</p>
              <ul
                v-if="appealFor(item).evidence.length"
                class="my-reports__evidence"
              >
                <li
                  v-for="(file, index) in appealFor(item).evidence"
                  :key="file.url"
                >
                  <img :src="file.url" :alt="file.name" />
                  <button
                    type="button"
                    @click="removeEvidence(appealFor(item), index)"
                  >
                    移除
                  </button>
                </li>
              </ul>
              <p v-if="appealFor(item).error" role="alert">
                {{ appealFor(item).error }}
              </p>
              <button
                type="button"
                class="button-ink"
                :disabled="
                  appealFor(item).submitting || appealFor(item).uploading
                "
                @click="sendAppeal(item)"
              >
                提交申诉
              </button>
            </div>
          </template>
          <p v-else>申诉期限已过或已提交。</p>
        </li>
      </ul>
      <PaginationControls
        v-if="decisions.total.value > decisions.size.value"
        :page="decisions.page.value"
        :total="decisions.total.value"
        :size="decisions.size.value"
        @change="decisions.page.value = $event"
      />
    </template>
  </main>
</template>

<style scoped lang="scss">
.my-reports {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 760px);
  margin: var(--ft-space-6) auto;

  &__tabs {
    display: flex;
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

    blockquote {
      white-space: pre-wrap;
      color: var(--ft-color-text-muted);
    }
  }

  &__decision {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--ft-color-secondary);
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

  &__thread,
  &__appeal {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--ft-color-secondary);

    ul {
      padding-left: 18px;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      margin: 6px 0;
      padding: 6px 8px;
    }
  }

  &__evidence {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      gap: 4px;
      padding: 0;
      border: 0;
      background: transparent;
    }

    img {
      width: 88px;
      height: 88px;
      object-fit: cover;
      border: 1px solid var(--ft-color-secondary);
    }

    button {
      border: 0;
      background: transparent;
      color: var(--ft-color-danger);
      cursor: pointer;
    }
  }
}
</style>
