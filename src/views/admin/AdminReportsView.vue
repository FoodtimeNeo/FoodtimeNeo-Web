<script setup>
import { reactive, ref } from 'vue';
import {
  decideReport,
  fetchAdminReportFollowUps,
  fetchReports,
  replyReportFollowUp,
} from '@/api/safety.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { uploadImage } from '@/api/submission.api.js';
import { formatTime } from '@/utils/recordLabels.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const state = usePagedData(fetchReports);
const reviewing = ref('');
const reviewError = ref('');
const labels = { post: '食记', comment: '评论', message: '私信' };
const drafts = reactive({});
const threads = reactive({});
const replies = reactive({});

function draftFor(report) {
  if (!drafts[report.id])
    drafts[report.id] = {
      outcome: 'upheld',
      publicReason: '',
      internalNote: '',
    };
  return drafts[report.id];
}

function threadFor(report) {
  if (!threads[report.id])
    threads[report.id] = { open: false, items: [], loading: false, error: '' };
  return threads[report.id];
}

async function toggleThread(report) {
  const thread = threadFor(report);
  thread.open = !thread.open;
  if (!thread.open || thread.items.length) return;
  thread.loading = true;
  thread.error = '';
  try {
    const data = await fetchAdminReportFollowUps(report.id);
    thread.items = data.items;
  } catch (failure) {
    thread.error = failure.message || '无法读取追问记录';
  } finally {
    thread.loading = false;
  }
}

function replyFor(report) {
  if (!replies[report.id])
    replies[report.id] = {
      content: '',
      internalNote: '',
      evidence: [],
      uploading: false,
      error: '',
      submitting: false,
      requestId: crypto.randomUUID(),
    };
  return replies[report.id];
}

async function addReplyEvidence(state, event) {
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
  } catch (failure) {
    state.error = failure.message || '证据上传失败';
  } finally {
    state.uploading = false;
  }
}

async function reply(report) {
  const draft = replyFor(report);
  if (!draft.content.trim()) {
    draft.error = '请填写公开回复';
    return;
  }
  draft.submitting = true;
  draft.error = '';
  try {
    const created = await replyReportFollowUp(report.id, {
      content: draft.content.trim(),
      internalNote: draft.internalNote.trim() || undefined,
      evidenceUrls: draft.evidence.map((item) => item.url),
      clientRequestId: draft.requestId,
    });
    threadFor(report).items.push(created);
    draft.content = '';
    draft.internalNote = '';
    draft.evidence = [];
    draft.requestId = crypto.randomUUID();
  } catch (failure) {
    draft.error = failure.message || '回复失败';
  } finally {
    draft.submitting = false;
  }
}

async function decide(report) {
  if (reviewing.value) return;
  const draft = draftFor(report);
  if (!draft.publicReason.trim()) {
    reviewError.value = '请填写公开理由';
    return;
  }
  reviewing.value = report.id;
  reviewError.value = '';
  try {
    await decideReport(report.id, {
      outcome: draft.outcome,
      publicReason: draft.publicReason.trim(),
      internalNote: draft.internalNote.trim() || undefined,
    });
    delete drafts[report.id];
    if (state.items.value.length === 1 && state.page.value > 1)
      state.page.value--;
    else await state.load();
  } catch (failure) {
    reviewError.value = failure.message || '处理失败，请重试';
  } finally {
    reviewing.value = '';
  }
}
</script>

<template>
  <main class="reports">
    <h1 class="section-title">举报处理</h1>
    <p>仅平台管理员可查看。私信举报只包含当事人所选的消息。</p>
    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <template v-else>
      <p v-if="reviewError" role="alert">{{ reviewError }}</p>
      <p v-if="!state.items.value.length">当前没有待处理举报。</p>
      <ul v-else>
        <li v-for="row in state.items.value" :key="row.id">
          <h2>{{ labels[row.targetType] }}</h2>
          <p>举报原因：{{ row.reason }}</p>
          <blockquote>{{ row.excerpt }}</blockquote>
          <p>被举报用户：{{ row.targetUserId }}</p>
          <RouterLink
            v-if="row.postId"
            :to="{
              name: 'communityDetail',
              params: { postId: row.postId },
              query:
                row.targetType === 'comment' ? { comment: row.targetId } : {},
            }"
          >
            查看原帖
          </RouterLink>
          <div class="report-decision">
            <label>
              结论
              <select v-model="draftFor(row).outcome">
                <option value="upheld">成立</option>
                <option value="not_upheld">不成立</option>
              </select>
            </label>
            <label>
              公开理由
              <textarea
                v-model="draftFor(row).publicReason"
                maxlength="500"
                rows="2"
              ></textarea>
            </label>
            <label>
              内部备注（不公开）
              <input v-model="draftFor(row).internalNote" maxlength="2000" />
            </label>
            <button
              class="button-ink"
              :disabled="!!reviewing"
              @click="decide(row)"
            >
              {{ reviewing === row.id ? '提交中…' : '提交决定' }}
            </button>
          </div>
          <button
            type="button"
            class="report-thread-toggle"
            @click="toggleThread(row)"
          >
            {{ threadFor(row).open ? '收起追问' : '查看/回复追问' }}
          </button>
          <div v-if="threadFor(row).open" class="report-thread">
            <p v-if="threadFor(row).loading">正在读取…</p>
            <ul>
              <li v-for="item in threadFor(row).items" :key="item.id">
                <strong>{{
                  item.authorRole === 'staff' ? '管理员' : '举报人'
                }}</strong>
                <p>{{ item.content }}</p>
                <p v-if="item.internalNote">
                  <em>内部备注：{{ item.internalNote }}</em>
                </p>
                <small>{{ formatTime(item.createdAt) }}</small>
              </li>
            </ul>
            <p v-if="threadFor(row).error" role="alert">
              {{ threadFor(row).error }}
            </p>
            <label>
              公开回复
              <textarea
                v-model="replyFor(row).content"
                rows="2"
                maxlength="500"
              ></textarea>
            </label>
            <label>
              内部备注（不公开）
              <input v-model="replyFor(row).internalNote" maxlength="2000" />
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              :disabled="
                replyFor(row).uploading || replyFor(row).evidence.length >= 3
              "
              @change="addReplyEvidence(replyFor(row), $event)"
            />
            <p v-if="replyFor(row).uploading">正在上传证据…</p>
            <ul
              v-if="replyFor(row).evidence.length"
              class="report-thread-evidence"
            >
              <li v-for="file in replyFor(row).evidence" :key="file.url">
                <img :src="file.url" :alt="file.name" />
                <span>{{ file.name }}</span>
              </li>
            </ul>
            <p v-if="replyFor(row).error" role="alert">
              {{ replyFor(row).error }}
            </p>
            <button
              type="button"
              class="button-ink"
              :disabled="replyFor(row).submitting || replyFor(row).uploading"
              @click="reply(row)"
            >
              提交回复
            </button>
          </div>
        </li>
      </ul>
      <PaginationControls
        v-if="state.page.value > 1 || state.total.value > state.size.value"
        :page="state.page.value"
        :total="state.total.value"
        :size="state.size.value"
        @change="state.page.value = $event"
      />
    </template>
  </main>
</template>

<style scoped>
.reports ul {
  list-style: none;
  padding: 0;
}
.reports li {
  padding: 16px 0;
  border-bottom: 1px solid var(--ft-color-text);
  overflow-wrap: anywhere;
}
.reports blockquote {
  white-space: pre-wrap;
}
.reports li a {
  margin-right: 12px;
}
.report-decision {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.report-decision label {
  display: grid;
  gap: 4px;
}
.report-decision textarea,
.report-decision input,
.report-decision select {
  box-sizing: border-box;
  width: 100%;
  max-width: 560px;
  padding: 6px 8px;
}
.report-decision button {
  justify-self: start;
}
</style>
