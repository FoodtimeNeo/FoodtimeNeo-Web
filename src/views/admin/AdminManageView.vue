<script setup>
import { ref, watch, nextTick } from 'vue';
import {
  fetchManagedItems,
  fetchManagedItem,
  deleteManagedItem,
} from '@/api/admin-manage.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { clearAsyncDataCache } from '@/composables/useAsyncData.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import { statusLabels } from '@/utils/recordLabels.js';
import CatalogEditor from './CatalogEditorFormView.vue';
import ParentPicker from '@/components/admin/ParentPicker.vue';
import CompactMediaPreview from '@/components/admin/CompactMediaPreview.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
const type = ref('dining-halls');
const parent = ref('');
const loadParents = (page, options) =>
  fetchManagedItems(
    type.value === 'stalls' ? 'dining-halls' : 'stalls',
    page,
    '',
    options,
  );
const { items, page, total, size, loading, error, load } = usePagedData(
  (page, options) => fetchManagedItems(type.value, page, parent.value, options),
);
const editor = ref(null);
const selected = ref(null);
const writing = ref(false);
const loadingId = ref('');
const failure = ref('');
const notice = ref('');
watch(type, () => {
  editor.value = null;
  selected.value = null;
  parent.value = '';
  if (page.value !== 1) page.value = 1;
  else load();
});
watch(parent, () => {
  if (page.value !== 1) page.value = 1;
  else load();
});
async function edit(row) {
  if (writing.value) return;
  writing.value = true;
  loadingId.value = row.id;
  failure.value = '';
  selected.value = null;
  try {
    editor.value = { item: await fetchManagedItem(type.value, row.id) };
    await nextTick();
    const el = document.querySelector('.catalog-editor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    failure.value = error.message;
  } finally {
    writing.value = false;
    loadingId.value = '';
  }
}
async function saved() {
  editor.value = null;
  clearAsyncDataCache('canteens_list');
  notice.value = '保存成功';
  await load();
}
async function remove() {
  if (writing.value || !selected.value) return;
  writing.value = true;
  failure.value = '';
  try {
    await deleteManagedItem(type.value, selected.value.id);
    selected.value = null;
    clearAsyncDataCache('canteens_list');
    notice.value = '已删除';
    if (items.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (error) {
    failure.value = error.message || '删除失败';
  } finally {
    writing.value = false;
  }
}
</script>
<template>
  <section class="manage">
    <h2 class="section-title">目录管理</h2>
    <div class="manage__filters">
      <label
        >目录类型<select v-model="type" :disabled="writing || !!editor">
          <option value="dining-halls">食堂</option>
          <option value="stalls">档口</option>
          <option value="dishes">菜品</option>
        </select></label
      >
      <ParentPicker
        v-if="type !== 'dining-halls'"
        :key="type"
        v-model="parent"
        class="manage__parent-picker"
        :loader="loadParents"
        label="按所属记录筛选"
        optional
        compact
        :disabled="writing || !!editor"
      />
      <button
        :disabled="writing || !!editor"
        @click="
          editor = { item: null };
          failure = '';
          notice = '';
        "
      >
        新增
      </button>
    </div>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <CatalogEditor
      v-if="editor && !editor.item"
      :key="type + (editor.item?.id || 'new')"
      :type="type"
      :item="editor.item"
      @cancel="editor = null"
      @saved="saved"
    />
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState v-else-if="!items.length" title="暂无目录记录" />
    <article v-for="row in !loading && !error ? items : []" :key="row.id">
      <h3>{{ row.name }} · {{ statusLabels[row.status] }}</h3>
      <p>ID：{{ row.id }}</p>
      <p v-if="row.parentId">所属 ID：{{ row.parentId }}</p>
      <details v-if="row.description" class="description">
        <summary>
          <span>{{ row.description }}</span
          ><span class="description__hint">展开／收起</span>
        </summary>
        <p>{{ row.description }}</p>
      </details>
      <p v-if="type === 'dishes'">{{ formatPrice(row.price) }}</p>
      <p v-else>排序：{{ row.sortOrder }}</p>
      <CompactMediaPreview
        v-if="row.coverImageUrl"
        :src="row.coverImageUrl"
        alt="目录封面"
      />
      <CatalogEditor
        v-if="editor?.item?.id === row.id"
        :key="type + row.id"
        :type="type"
        :item="editor.item"
        @cancel="editor = null"
        @saved="saved"
      />
      <CatalogEditor
        v-if="editor?.item?.id === row.id"
        :key="type + row.id"
        :type="type"
        :item="editor.item"
        @cancel="editor = null"
        @saved="saved"
      />
      <CatalogEditor
        v-if="editor?.item?.id === row.id"
        :key="type + row.id"
        :type="type"
        :item="editor.item"
        @cancel="editor = null"
        @saved="saved"
      />
      <div v-if="selected?.id === row.id">
        <p>确认删除这条目录记录？有关联时后端会阻止删除，可选择编辑并停用。</p>
        <button :disabled="writing" @click="selected = null">取消删除</button
        ><button :disabled="writing" @click="remove">确认删除</button>
      </div>
      <div v-else-if="editor?.item?.id !== row.id">
        <button :disabled="writing || !!editor" @click="edit(row)">
          {{ loadingId === row.id ? '读取中…' : '编辑' }}</button
        ><button
          :disabled="writing || !!editor"
          @click="
            selected = row;
            failure = '';
          "
        >
          删除
        </button>
      </div>
    </article>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || writing || !!editor"
      @change="
        selected = null;
        page = $event;
      "
    />
  </section>
</template>
<style scoped>
.manage {
  max-width: 1000px;
  margin: auto;
  overflow-wrap: anywhere;
}
.manage__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 8px 12px;
  margin: 10px 0;
  padding: 10px 12px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card-alt);
}
.manage__filters > label {
  display: inline-grid;
  gap: 6px;
  min-width: min(100%, 180px);
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
select,
button,
input,
textarea {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 0;
  background: var(--zine-paper-card);
}
button {
  margin: 6px 8px 0 0;
  box-shadow: 2px 2px 0 var(--ft-color-secondary);
  color: var(--ft-color-secondary);
  font-weight: 700;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--ft-color-secondary);
  color: #fffaf0;
  transform: translate(-1px, -1px);
}
article {
  margin: 10px 0;
  padding: 12px 14px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 2px 2px 0 var(--zine-paper-shadow);
  clip-path: none;
}
article:nth-of-type(even) {
  transform: none;
}
article:nth-of-type(odd) {
  transform: none;
}
h3 {
  margin: 0 0 6px;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: 18px;
  line-height: 1.4;
}
article > p {
  margin: 2px 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.description {
  white-space: pre-wrap;
  margin: 6px 0;
}
.description summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 8px;
  cursor: pointer;
  list-style: none;
}
.description summary::-webkit-details-marker {
  display: none;
}
.description summary > span:first-child {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.description__hint {
  font-size: var(--ft-font-size-sm);
  color: var(--ft-color-primary);
}
.description[open] summary > span:first-child {
  visibility: hidden;
  height: 0;
}
.description > p {
  margin: 4px 0;
}
.description summary:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 3px;
}
.manage__filters > button {
  margin: 0 0 0 auto;
}
.manage__parent-picker {
  flex: 1 1 240px;
  min-width: 0;
}
.manage__parent-picker :deep(select) {
  width: 100%;
  min-width: 0;
}
.manage__parent-picker :deep(label) {
  display: block;
  font-size: var(--ft-font-size-sm);
}
button:focus-visible,
select:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 3px;
}
.manage :deep(.catalog-editor) {
  margin: 18px 0;
  padding: 18px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
}
[role='status'] {
  display: inline-block;
  padding: 6px 12px;
  border: 2px solid var(--zine-stamp-blue);
  color: var(--zine-stamp-blue);
  font-family: var(--zine-handwriting-font);
  transform: rotate(-2deg);
}
[role='alert'] {
  color: var(--ft-color-danger);
  font-weight: 700;
}
@media (max-width: 560px) {
  article,
  article:nth-of-type(even),
  article:nth-of-type(odd) {
    padding: 16px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
  .manage__filters > label {
    width: 100%;
  }
  .manage__parent-picker {
    flex-basis: 100%;
  }
  .description summary {
    min-height: 44px;
  }
}
@media (min-width: 769px) and (pointer: fine) {
  .manage__filters select,
  .manage > article > div > button,
  .manage__filters > button {
    min-height: 36px;
    padding: 5px 10px;
  }
}
</style>
