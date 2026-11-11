<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  searchAdminNotices,
  saveNoticeMarkdown,
  saveNoticeSchedule,
} from '@/api/notice.api.js';
import { noticeHeading } from '@/utils/noticeMarkdown.js';
import {
  formatNoticeTime,
  noticeScheduleForm,
  noticeSchedulePayload,
} from '@/utils/noticeSchedule.js';
import NoticeMarkdown from '@/components/NoticeMarkdown.vue';

const editor = ref(false),
  content = ref(''),
  editing = ref(null);
const form = reactive(noticeScheduleForm());
const rows = ref([]),
  page = ref(1),
  total = ref(0),
  query = ref('');
const loading = ref(false),
  writing = ref(false),
  failure = ref(''),
  message = ref('');
let sequence = 0,
  disposed = false;
onBeforeUnmount(() => {
  disposed = true;
  sequence++;
});
const statuses = {
  draft: '草稿',
  scheduled: '等待发布',
  waiting: '等待弹窗开始',
  active: '弹窗生效中',
  paused: '弹窗已停用',
  expired: '已截止，信箱留档',
};
async function load() {
  const ticket = ++sequence;
  loading.value = true;
  failure.value = '';
  try {
    const result = await searchAdminNotices(page.value, query.value);
    if (disposed || ticket !== sequence) return;
    rows.value = result.items;
    total.value = result.total;
  } catch (error) {
    if (ticket === sequence) failure.value = error.message || '读取失败';
  } finally {
    if (ticket === sequence) loading.value = false;
  }
}
onMounted(load);
function create() {
  editing.value = null;
  content.value = '';
  Object.assign(form, noticeScheduleForm());
  failure.value = '';
  message.value = '';
  editor.value = true;
}
function edit(row) {
  editing.value = row;
  content.value = row.content;
  Object.assign(form, noticeScheduleForm(row));
  failure.value = '';
  message.value = '';
  editor.value = true;
}
async function save(publish) {
  if (writing.value) return;
  failure.value = '';
  message.value = '';
  if (!content.value.trim()) {
    failure.value = '内容不能为空';
    return;
  }
  if (!noticeHeading(content.value)) {
    failure.value = '请在 Markdown 中添加非空标题';
    return;
  }
  let schedule;
  try {
    schedule = noticeSchedulePayload(form, {
      published: publish,
      enabled: publish ? form.enabled : false,
    });
  } catch (error) {
    failure.value = error.message;
    return;
  }
  writing.value = true;
  try {
    await saveNoticeMarkdown(
      content.value,
      editing.value?.id || null,
      schedule,
    );
    if (disposed) return;
    editor.value = false;
    editing.value = null;
    content.value = '';
    page.value = 1;
    query.value = '';
    message.value = publish
      ? '发布计划已保存，将按 UTC+8 时间自动生效'
      : '草稿已保存，不会向用户发布或弹出';
    await load();
  } catch (error) {
    if (!disposed) failure.value = error.message || '保存失败，请重试';
  } finally {
    writing.value = false;
  }
}
async function toggle(row) {
  if (writing.value) return;
  writing.value = true;
  failure.value = '';
  message.value = '';
  try {
    const schedule = noticeSchedulePayload(noticeScheduleForm(row), {
      published: true,
      enabled: !row.enabled,
    });
    await saveNoticeSchedule(row.id, schedule);
    if (disposed) return;
    message.value = row.enabled
      ? '弹窗已停用，已发布公告仍在信箱留档'
      : '弹窗已启用，将按排期和分类选择最新有效公告';
    await load();
  } catch (error) {
    if (!disposed) failure.value = error.message || '设置失败，请重试';
  } finally {
    writing.value = false;
  }
}
function search() {
  page.value = 1;
  load();
}
function turn(delta) {
  page.value += delta;
  load();
}
</script>
<template>
  <section class="admin-notices">
    <h2 class="section-title">公告管理</h2>
    <p>
      时间统一为
      UTC+8。到发布时间进入用户信箱，弹窗按开始和截止时间显示。每类只弹最新有效一条，先更新公告，再普通公告。
    </p>
    <nav aria-label="公告管理功能">
      <button :disabled="writing" @click="create">创建公告</button
      ><button :disabled="writing" @click="editor = false">公告列表</button>
    </nav>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="failure" role="alert">
      {{ failure }} <button v-if="!editor" @click="load">重试查询</button>
    </p>
    <form v-if="editor" class="notice-editor" @submit.prevent="save(true)">
      <h3>{{ editing ? '编辑公告' : '创建公告' }}</h3>
      <label class="notice-check"
        ><input
          v-model="form.isUpdate"
          type="checkbox"
          :disabled="writing"
        />这是更新公告</label
      >
      <div class="notice-times">
        <label
          >发布时间（UTC+8，留空立即发布）<input
            v-model="form.publishedAt"
            type="datetime-local"
            step="60"
            :disabled="writing"
        /></label>
        <label
          >开始显示时间（UTC+8，留空沿用发布时间）<input
            v-model="form.displayStartsAt"
            type="datetime-local"
            step="60"
            :disabled="writing"
        /></label>
        <label
          >弹窗截止方式<select
            v-model="form.deadlineMode"
            aria-label="弹窗截止方式"
            :disabled="writing"
          >
            <option value="none">不设截止时间</option>
            <option value="date">截止到指定日期结束</option>
            <option value="minute">截止到指定日期和时分</option>
          </select></label
        >
        <label v-if="form.deadlineMode === 'date'"
          >截止日期（包含当天）<input
            v-model="form.expiresOn"
            aria-label="截止日期（包含当天）"
            type="date"
            :disabled="writing"
          /><small>次日 00:00 停止弹窗，公告仍在信箱留档。</small></label
        >
        <label v-if="form.deadlineMode === 'minute'"
          >截止日期和时间（UTC+8）<input
            v-model="form.displayEndsAt"
            type="datetime-local"
            step="60"
            :disabled="writing"
        /></label>
      </div>
      <label class="notice-check"
        ><input
          v-model="form.enabled"
          type="checkbox"
          :disabled="writing"
        />发布后启用弹窗（遵循上面的时间）</label
      >
      <div class="notice-columns">
        <label
          >Markdown 内容<textarea
            v-model="content"
            maxlength="20000"
            rows="16"
            :disabled="writing"
          />
        </label>
        <section aria-label="Markdown 预览">
          <h3>预览</h3>
          <NoticeMarkdown :content="content" />
        </section>
      </div>
      <p>列表标题：{{ noticeHeading(content) || '尚未填写标题' }}</p>
      <div class="notice-actions">
        <button type="submit" :disabled="writing">
          {{
            writing
              ? '保存中…'
              : editing?.published
                ? '保存修改'
                : '发布或定时发布'
          }}</button
        ><button
          v-if="!editing?.published"
          type="button"
          :disabled="writing"
          @click="save(false)"
        >
          保存草稿</button
        ><button type="button" :disabled="writing" @click="editor = false">
          返回列表
        </button>
      </div>
    </form>
    <div v-else>
      <form class="search" @submit.prevent="search">
        <label
          >搜索标题<input
            v-model="query"
            type="search"
            maxlength="200"
            :disabled="writing" /></label
        ><button :disabled="loading || writing">搜索</button>
      </form>
      <p v-if="loading" role="status">加载中…</p>
      <p v-else-if="!rows.length">没有匹配的公告</p>
      <article v-for="row in rows" :key="row.id" class="notice-record">
        <h3>{{ row.title }}</h3>
        <p>
          {{ row.isUpdate ? '更新公告' : '普通公告' }} ·
          {{ statuses[row.status] || '已保存' }}
        </p>
        <dl>
          <div>
            <dt>发布时间</dt>
            <dd>{{ formatNoticeTime(row.publishedAt) }}</dd>
          </div>
          <div>
            <dt>弹窗开始</dt>
            <dd>
              {{ formatNoticeTime(row.displayStartsAt || row.publishedAt) }}
            </dd>
          </div>
          <div>
            <dt>弹窗截止</dt>
            <dd>
              {{
                row.expiresOn
                  ? row.expiresOn + ' 当天结束（UTC+8）'
                  : row.displayEndsAt
                    ? formatNoticeTime(row.displayEndsAt)
                    : '不设截止时间'
              }}
            </dd>
          </div>
        </dl>
        <div class="notice-actions">
          <button :disabled="writing" @click="edit(row)">编辑</button
          ><button
            v-if="row.published"
            :disabled="writing"
            @click="toggle(row)"
          >
            {{ row.enabled ? '停用弹窗' : '启用弹窗' }}</button
          ><button v-else :disabled="writing" @click="edit(row)">
            设置发布计划
          </button>
        </div>
      </article>
      <nav class="notice-actions" aria-label="公告分页">
        <button :disabled="loading || writing || page <= 1" @click="turn(-1)">
          上一页</button
        ><span>第 {{ page }} 页 · {{ total }} 条</span
        ><button
          :disabled="loading || writing || page * 6 >= total"
          @click="turn(1)"
        >
          下一页
        </button>
      </nav>
    </div>
  </section>
</template>
<style scoped>
.admin-notices {
  overflow-wrap: anywhere;
}
button {
  min-height: 44px;
  padding: 8px 16px;
  font: inherit;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  border: 1px solid var(--ft-color-border);
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
nav,
.notice-actions,
.search {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
  margin: 16px 0;
}
label {
  display: grid;
  gap: 8px;
}
input,
select,
textarea {
  font: inherit;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px;
  color: var(--ft-color-text);
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-border);
}
.notice-editor {
  display: grid;
  gap: 16px;
}
.notice-check {
  display: flex;
  align-items: center;
  min-height: 44px;
}
.notice-times,
.notice-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.notice-columns section {
  min-width: 0;
  padding: 12px;
  border: 1px dashed var(--ft-color-border);
}
.notice-record {
  margin: 20px 0;
  padding: 16px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
}
dl div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 8px 0;
}
dt {
  font-weight: bold;
}
dd {
  margin: 0;
}
@media (max-width: 768px) {
  .notice-times,
  .notice-columns {
    grid-template-columns: 1fr;
  }
}
</style>
