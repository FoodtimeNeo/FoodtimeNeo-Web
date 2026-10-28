<script setup>
import { ref } from 'vue';
import { usePagedData } from '@/composables/usePagedData.js';
import {
  createAdminNotice,
  deleteAdminNotice,
  fetchAdminNotice,
  fetchAdminNotices,
  updateAdminNotice,
} from '@/api/notice.api.js';
import { formatTime } from '@/utils/recordLabels.js';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const { items, page, total, size, loading, error, load } =
  usePagedData(fetchAdminNotices);

const form = ref({ title: '', body: '' });
const editingId = ref(null);
const confirming = ref(null);
const writing = ref(false);
const failure = ref('');
const notice = ref('');

function resetForm() {
  form.value = { title: '', body: '' };
  editingId.value = null;
  confirming.value = null;
  failure.value = '';
}

function validate() {
  if (!form.value.title.trim()) return '标题不能为空';
  if (form.value.title.trim().length > 200) return '标题不能超过200个字符';
  if (!form.value.body.trim()) return '正文不能为空';
  if (form.value.body.trim().length > 20000) return '正文不能超过20000个字符';
  return '';
}

async function submit() {
  if (writing.value) return;
  failure.value = '';
  notice.value = '';
  const message = validate();
  if (message) {
    failure.value = message;
    return;
  }
  writing.value = true;
  try {
    const input = {
      title: form.value.title.trim(),
      body: form.value.body.trim(),
    };
    const wasEditing = Boolean(editingId.value);
    if (wasEditing) {
      await updateAdminNotice(editingId.value, input);
      notice.value = '公告已更新';
    } else {
      await createAdminNotice(input);
      notice.value = '公告已发布';
    }
    resetForm();
    if (!wasEditing && page.value !== 1) page.value = 1;
    else await load();
  } catch (submitError) {
    failure.value = submitError.message || '保存失败';
  } finally {
    writing.value = false;
  }
}

async function edit(row) {
  if (writing.value) return;
  writing.value = true;
  failure.value = '';
  notice.value = '';
  confirming.value = null;
  try {
    const detail = await fetchAdminNotice(row.id);
    form.value = { title: detail.title, body: detail.body };
    editingId.value = row.id;
  } catch (fetchError) {
    failure.value = fetchError.message || '读取公告失败';
  } finally {
    writing.value = false;
  }
}

async function remove() {
  if (writing.value || !confirming.value) return;
  writing.value = true;
  failure.value = '';
  try {
    await deleteAdminNotice(confirming.value);
    confirming.value = null;
    notice.value = '公告已删除';
    resetForm();
    if (items.value.length === 1 && page.value > 1) page.value -= 1;
    else await load();
  } catch (deleteError) {
    failure.value = deleteError.message || '删除失败';
  } finally {
    writing.value = false;
  }
}
</script>

<template>
  <section class="admin-notices">
    <h2 class="section-title">公告管理</h2>

    <form
      class="admin-notices__form"
      aria-label="公告编辑表单"
      @submit.prevent="submit"
    >
      <h3>{{ editingId ? '编辑公告' : '发布公告' }}</h3>
      <label>
        标题
        <input
          v-model="form.title"
          type="text"
          maxlength="200"
          placeholder="公告标题（最多200字）"
          :disabled="writing"
        />
      </label>
      <label>
        正文
        <textarea
          v-model="form.body"
          rows="6"
          maxlength="20000"
          placeholder="公告正文（最多20000字）"
          :disabled="writing"
        ></textarea>
      </label>
      <div class="admin-notices__actions">
        <button type="submit" :disabled="writing">
          {{ writing ? '保存中' : editingId ? '保存修改' : '发布公告' }}
        </button>
        <button v-if="editingId" type="button" @click="resetForm">
          取消编辑
        </button>
      </div>
    </form>

    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="failure" role="alert">{{ failure }}</p>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState v-else-if="!items.length" title="暂无公告" />
    <template v-else>
      <article v-for="row in items" :key="row.id" class="admin-notices__item">
        <h3>{{ row.title }}</h3>
        <p class="admin-notices__meta">
          {{ formatTime(row.publishedAt) }} · ID：{{ row.id }}
        </p>
        <p class="admin-notices__preview">{{ row.body }}</p>
        <div class="admin-notices__actions">
          <button type="button" :disabled="writing" @click="edit(row)">
            编辑
          </button>
          <button
            v-if="confirming !== row.id"
            type="button"
            class="is-danger"
            :disabled="writing"
            @click="confirming = row.id"
          >
            删除
          </button>
        </div>
        <div
          v-if="confirming === row.id"
          role="group"
          aria-label="确认删除公告"
        >
          <p>确认删除这条公告？已读记录会一并删除。</p>
          <button type="button" :disabled="writing" @click="confirming = null">
            取消
          </button>
          <button type="button" :disabled="writing" @click="remove">
            {{ writing ? '删除中' : '确认删除' }}
          </button>
        </div>
      </article>
    </template>

    <PaginationControls
      v-if="total > size"
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || writing"
      @change="page = $event"
    />
  </section>
</template>

<style scoped>
.admin-notices {
  display: grid;
  gap: 16px;
  max-width: 900px;
}
.admin-notices__form {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
}
.admin-notices__form h3 {
  margin: 0;
}
.admin-notices__form label {
  display: grid;
  gap: 6px;
  font-weight: 700;
}
.admin-notices__form input,
.admin-notices__form textarea {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--ft-color-text);
  background: #fff;
  font: inherit;
}
.admin-notices__actions {
  display: flex;
  gap: 12px;
}
.admin-notices__actions button {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  cursor: pointer;
}
.admin-notices__actions button:disabled {
  opacity: 0.5;
  cursor: default;
}
.admin-notices__actions .is-danger {
  color: var(--ft-color-danger);
  border-color: var(--ft-color-danger);
}
.admin-notices__item {
  padding: 16px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
}
.admin-notices__item h3 {
  margin: 0 0 4px;
}
.admin-notices__meta {
  margin: 0 0 8px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.admin-notices__preview {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
}
</style>
