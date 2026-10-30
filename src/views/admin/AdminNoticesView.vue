<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  searchAdminNotices,
  fetchNoticeSettings,
  setNoticeSettings,
  saveNoticeMarkdown,
  fetchAdminNotice,
} from '@/api/notice.api.js';
import { noticeHeading } from '@/utils/noticeMarkdown.js';
import NoticeMarkdown from '@/components/NoticeMarkdown.vue';
import { formatTime } from '@/utils/recordLabels.js';
const screen = ref('settings'),
  content = ref(''),
  editing = ref(null);
const rows = ref([]),
  page = ref(1),
  total = ref(0),
  query = ref('');
const active = ref(null),
  activeTitle = ref('暂不显示公告'),
  selected = ref(null);
const loading = ref(false),
  ready = ref(false),
  writing = ref(false),
  failure = ref(''),
  status = ref('');
const preview = ref(null),
  reader = ref(null);
const heading = computed(() => noticeHeading(content.value));
let sequence = 0,
  disposed = false;
onBeforeUnmount(() => {
  disposed = true;
  sequence++;
});
async function load() {
  const ticket = ++sequence;
  loading.value = true;
  failure.value = '';
  try {
    const result = await searchAdminNotices(page.value, query.value);
    if (ticket !== sequence || disposed) return;
    rows.value = result.items;
    total.value = result.total;
  } catch (e) {
    if (ticket === sequence) failure.value = e.message || '读取失败';
  } finally {
    if (ticket === sequence) loading.value = false;
  }
}
async function initialize() {
  ready.value = false;
  failure.value = '';
  try {
    const settings = await fetchNoticeSettings();
    const current = settings.noticeId
      ? await fetchAdminNotice(settings.noticeId)
      : null;
    if (disposed) return;
    active.value = settings.noticeId;
    selected.value = current;
    activeTitle.value = current?.title || '暂不显示公告';
    ready.value = true;
    await load();
  } catch (e) {
    failure.value = e.message || '读取配置失败';
  }
}
onMounted(initialize);
async function save() {
  if (writing.value) return;
  failure.value = '';
  status.value = '';
  if (!content.value.trim()) {
    failure.value = '内容不能为空';
    return;
  }
  if (!heading.value) {
    failure.value = '请在 Markdown 中添加非空标题';
    return;
  }
  writing.value = true;
  try {
    const saved = await saveNoticeMarkdown(content.value, editing.value);
    if (disposed) return;
    selected.value = saved;
    content.value = '';
    editing.value = null;
    screen.value = 'settings';
    query.value = '';
    page.value = 1;
    status.value = '公告已保存，请确认是否设置为当前公告';
    await load();
  } catch (e) {
    failure.value = e.message || '保存失败';
  } finally {
    writing.value = false;
  }
}
function edit() {
  content.value = selected.value.content;
  editing.value = selected.value.id;
  screen.value = 'create';
}
async function apply() {
  if (writing.value || !ready.value) return;
  writing.value = true;
  failure.value = '';
  status.value = '';
  try {
    await setNoticeSettings(selected.value?.id || null);
    if (disposed) return;
    active.value = selected.value?.id || null;
    activeTitle.value = selected.value?.title || '暂不显示公告';
    status.value = '公告设置已保存';
  } catch (e) {
    failure.value = e.message || '设置失败，请重试';
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
function openPreview() {
  preview.value = selected.value;
  reader.value.showModal();
}
</script>
<template>
  <section class="admin-notices">
    <h2 class="section-title">公告管理</h2>
    <nav aria-label="公告管理功能">
      <button
        :disabled="writing"
        :aria-pressed="screen === 'create'"
        @click="screen = 'create'"
      >
        创建公告</button
      ><button
        :disabled="writing"
        :aria-pressed="screen === 'settings'"
        @click="screen = 'settings'"
      >
        设置公告
      </button>
    </nav>
    <p v-if="status" role="status">{{ status }}</p>
    <div v-if="failure" role="alert">
      {{ failure }} <button v-if="!ready" @click="initialize">重试</button
      ><button v-else-if="screen === 'settings'" @click="load">重试查询</button>
    </div>
    <form v-if="screen === 'create'" @submit.prevent="save">
      <h3>{{ editing ? '编辑公告' : '创建公告' }}</h3>
      <p>
        使用 Markdown
        编写，列表名称取内容中最上级的第一个标题。保存后需在“设置公告”中确认。
      </p>
      <div class="editor">
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
      <p>列表名称：{{ heading || '尚未填写标题' }}</p>
      <button type="submit" :disabled="writing">
        {{ writing ? '保存中…' : '保存公告' }}</button
      ><button
        v-if="editing"
        type="button"
        :disabled="writing"
        @click="
          editing = null;
          content = '';
        "
      >
        取消编辑
      </button>
    </form>
    <div v-else class="settings">
      <p>
        当前公告：<strong>{{ activeTitle }}</strong>
      </p>
      <form class="search" @submit.prevent="search">
        <label
          >搜索标题<input
            v-model="query"
            type="search"
            maxlength="200"
            :disabled="writing" /></label
        ><button :disabled="loading || writing || !ready">搜索</button>
      </form>
      <p v-if="loading" role="status">加载中…</p>
      <div class="options" :aria-busy="loading">
        <label
          ><input
            type="radio"
            name="notice"
            :checked="!selected"
            :disabled="writing || !ready"
            @change="selected = null"
          />暂不显示公告</label
        >
        <label v-for="row in rows" :key="row.id"
          ><input
            type="radio"
            name="notice"
            :checked="selected?.id === row.id"
            :disabled="loading || writing"
            @change="selected = row"
          /><span
            >{{ row.title }} <small v-if="active === row.id">当前公告</small
            ><small
              >{{ formatTime(row.publishedAt) }} · {{ row.id }}</small
            ></span
          ></label
        >
        <p v-if="!loading && !rows.length">
          {{ query ? '没有匹配的公告' : '暂无公告，请先创建' }}
        </p>
      </div>

      <div class="apply-space" aria-hidden="true"></div>
      <Teleport to="body"
        ><footer class="apply">
          <nav aria-label="公告分页">
            <button
              :disabled="page <= 1 || loading || writing"
              @click="turn(-1)"
            >
              上一页</button
            ><span
              >第 {{ page }} / {{ Math.max(1, Math.ceil(total / 6)) }} 页 · 共
              {{ total }} 条</span
            ><button
              :disabled="page * 6 >= total || loading || writing"
              @click="turn(1)"
            >
              下一页
            </button>
          </nav>
          <p>
            待设置：<strong>{{ selected?.title || '暂不显示公告' }}</strong>
          </p>
          <button v-if="selected" :disabled="writing" @click="openPreview">
            查看全文</button
          ><button v-if="selected" :disabled="writing" @click="edit">
            编辑</button
          ><button
            :disabled="!ready || writing || (selected?.id || null) === active"
            @click="apply"
          >
            {{ writing ? '保存中…' : '确认设置' }}
          </button>
        </footer></Teleport
      >
    </div>
    <dialog ref="reader" aria-label="公告全文">
      <button @click="reader.close()">关闭</button
      ><NoticeMarkdown :content="preview?.content || ''" />
    </dialog>
  </section>
</template>
<style scoped>
.admin-notices {
  max-width: 1100px;
  display: grid;
  gap: 16px;
}
nav,
.search,
.apply {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
button {
  min-height: 44px;
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  font: inherit;
}
button[aria-pressed='true'] {
  border-bottom: 3px solid var(--ft-color-danger);
  font-weight: bold;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
input,
textarea {
  font: inherit;
  color: var(--ft-color-text);
  background: var(--zine-paper-card);
}
input[type='search'],
textarea {
  border: 1px solid var(--ft-color-text);
  padding: 12px;
  min-height: 44px;
}
label {
  display: grid;
  gap: 8px;
}
.editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.editor > * {
  min-width: 0;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
}
.settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: min(760px, calc(100dvh - 180px));
  min-height: 400px;
}
.settings > p {
  margin: 0;
}
.options {
  overflow: auto;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--ft-color-secondary);
}
.options label {
  display: flex;
  align-items: center;
  padding: 16px;
  min-height: 48px;
  gap: 12px;
  border-bottom: 1px solid var(--ft-color-secondary);
  overflow-wrap: anywhere;
}
small {
  display: block;
  color: var(--ft-color-text-muted);
}
input[type='radio'] {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.apply-space {
  min-height: 220px;
  flex-shrink: 0;
}
.apply {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: min(1100px, calc(100% - 28px));
  box-sizing: border-box;
  bottom: 16px;
  z-index: 90;
  flex-shrink: 0;
  background: var(--zine-paper-card);
  border-top: 2px solid var(--ft-color-text);
  padding: 12px 0;
}
.apply nav {
  width: 100%;
}
.apply p {
  flex: 1;
  min-width: 160px;
  overflow-wrap: anywhere;
  margin: 0;
}
.apply strong {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
dialog {
  max-width: 720px;
  width: 85vw;
  max-height: 80dvh;
  overflow: auto;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  border: 2px solid var(--ft-color-text);
}
dialog::backdrop {
  background: #0008;
}
@media (max-width: 700px) {
  .editor {
    grid-template-columns: 1fr;
  }
  .settings {
    height: calc(100dvh - 160px);
  }
  .apply {
    bottom: calc(80px + env(safe-area-inset-bottom));
  }
  .apply nav {
    width: 100%;
  }
  .apply p {
    flex-basis: 100%;
  }
}
</style>
