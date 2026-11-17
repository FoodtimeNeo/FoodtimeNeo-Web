<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue';
import {
  fetchAdminReportFollowUps,
  replyReportFollowUp,
} from '@/api/safety.api.js';
import { uploadImage } from '@/api/submission.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { validateImageFile } from '@/utils/submissionValidation.js';
import { formatTime } from '@/utils/recordLabels.js';
import PaginationControls from '@/components/base/PaginationControls.vue';

const props = defineProps({ reportId: { type: String, required: true } });
const open = ref(false);
const status = ref('');
const controller = new AbortController();
const thread = usePagedData(
  (page, options) => fetchAdminReportFollowUps(props.reportId, page, options),
  { immediate: false },
);
const draft = reactive({
  content: '',
  internalNote: '',
  evidence: [],
  uploading: false,
  submitting: false,
  error: '',
  requestId: crypto.randomUUID(),
});

function toggle() {
  open.value = !open.value;
  if (open.value) thread.load();
  else thread.cancel();
}

async function addEvidence(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length || draft.uploading || draft.submitting) return;
  draft.error = '';
  if (draft.evidence.length + files.length > 3) {
    draft.error = '证据图片最多3张';
    return;
  }
  const invalid = files.map(validateImageFile).find(Boolean);
  if (invalid) {
    draft.error = invalid;
    return;
  }
  draft.uploading = true;
  try {
    for (const file of files) {
      const uploaded = await uploadImage(file, { signal: controller.signal });
      if (controller.signal.aborted) return;
      draft.evidence.push({ url: uploaded.imageUrl, name: file.name });
    }
  } catch (failure) {
    if (!controller.signal.aborted)
      draft.error = failure.message || '证据上传失败';
  } finally {
    draft.uploading = false;
  }
}

async function reply() {
  if (draft.submitting || draft.uploading || controller.signal.aborted) return;
  if (!draft.content.trim()) {
    draft.error = '请填写公开回复';
    return;
  }
  draft.submitting = true;
  draft.error = '';
  status.value = '';
  try {
    await replyReportFollowUp(
      props.reportId,
      {
        content: draft.content.trim(),
        internalNote: draft.internalNote.trim() || undefined,
        evidenceUrls: draft.evidence.map((item) => item.url),
        clientRequestId: draft.requestId,
      },
      { signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    draft.content = '';
    draft.internalNote = '';
    draft.evidence = [];
    draft.requestId = crypto.randomUUID();
    status.value = '回复已提交';
    await thread.load();
    if (!thread.error.value && !controller.signal.aborted)
      thread.page.value = Math.max(
        1,
        Math.ceil(thread.total.value / thread.size.value),
      );
  } catch (failure) {
    if (!controller.signal.aborted) draft.error = failure.message || '回复失败';
  } finally {
    draft.submitting = false;
  }
}

onBeforeUnmount(() => controller.abort());
</script>

<template>
  <section class="report-thread-section">
    <button
      type="button"
      class="report-thread-toggle"
      :aria-expanded="open"
      @click="toggle"
    >
      {{ open ? '收起追问' : '查看/回复追问' }}
    </button>
    <div v-if="open" class="report-thread">
      <div class="report-thread__toolbar">
        <strong>追问记录</strong>
        <button
          type="button"
          :disabled="thread.loading.value || draft.submitting"
          @click="thread.load"
        >
          刷新记录
        </button>
      </div>
      <p v-if="thread.loading.value" role="status">正在读取…</p>
      <div v-if="thread.error.value" role="alert">
        <p>{{ thread.error.value.message || '无法读取追问记录' }}</p>
        <button type="button" @click="thread.load">重试读取</button>
      </div>
      <p v-else-if="!thread.loading.value && !thread.items.value.length">
        暂无追问记录。
      </p>
      <ul class="report-thread__messages">
        <li v-for="item in thread.items.value" :key="item.id">
          <strong>{{
            item.authorRole === 'staff' ? '管理员' : '举报人'
          }}</strong>
          <p>{{ item.content }}</p>
          <p v-if="item.internalNote">
            <em>内部备注（不公开）：{{ item.internalNote }}</em>
          </p>
          <div v-if="item.evidenceUrls?.length" class="report-thread__evidence">
            <a
              v-for="url in item.evidenceUrls"
              :key="url"
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
              ><img :src="url" alt="追问证据图片"
            /></a>
          </div>
          <small>{{ formatTime(item.createdAt) }}</small>
        </li>
      </ul>
      <PaginationControls
        v-if="thread.page.value > 1 || thread.total.value > thread.size.value"
        :page="thread.page.value"
        :total="thread.total.value"
        :size="thread.size.value"
        :disabled="thread.loading.value || draft.submitting"
        @change="thread.page.value = $event"
      />
      <fieldset :disabled="draft.submitting || draft.uploading">
        <legend>回复举报人</legend>
        <label
          >公开回复<textarea
            v-model="draft.content"
            rows="3"
            maxlength="500"
          ></textarea>
        </label>
        <label
          >内部备注（不公开）<input
            v-model="draft.internalNote"
            maxlength="2000"
        /></label>
        <label
          >证据图片（最多3张，可选）<input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            :disabled="draft.evidence.length >= 3"
            @change="addEvidence"
        /></label>
        <ul v-if="draft.evidence.length" class="report-thread__evidence">
          <li v-for="(file, index) in draft.evidence" :key="file.url">
            <img :src="file.url" :alt="file.name" /><span>{{ file.name }}</span>
            <button type="button" @click="draft.evidence.splice(index, 1)">
              移除
            </button>
          </li>
        </ul>
        <button type="button" class="button-ink" @click="reply">
          {{ draft.submitting ? '提交中…' : '提交回复' }}
        </button>
      </fieldset>
      <p v-if="draft.uploading" role="status">正在上传证据…</p>
      <p v-if="draft.error" role="alert">{{ draft.error }}</p>
      <p v-if="status" role="status">{{ status }}</p>
    </div>
  </section>
</template>

<style scoped>
.report-thread-toggle,
.report-thread button {
  min-height: 44px;
  padding: 6px 12px;
  font: inherit;
  color: var(--ft-color-text);
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-secondary);
  cursor: pointer;
}
.report-thread-toggle {
  margin-top: 12px;
}
.report-thread {
  display: grid;
  gap: 12px;
  margin-top: 12px;
  overflow-wrap: anywhere;
}
.report-thread__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.report-thread__messages {
  list-style: none;
  padding: 0;
  margin: 0;
}
.report-thread__messages > li {
  padding: 12px 0;
  border-bottom: 1px dashed var(--ft-color-border);
}
.report-thread p {
  white-space: pre-wrap;
}
.report-thread fieldset {
  display: grid;
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--ft-color-border);
}
.report-thread label {
  display: grid;
  gap: 6px;
}
.report-thread input,
.report-thread textarea {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 6px 8px;
  font: inherit;
}
.report-thread fieldset > button {
  justify-self: start;
}
.report-thread__evidence {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  list-style: none;
  padding: 0;
}
.report-thread__evidence li {
  display: grid;
  gap: 8px;
  max-width: 100%;
}
.report-thread__evidence img {
  display: block;
  width: 96px;
  height: 96px;
  object-fit: cover;
}
</style>
