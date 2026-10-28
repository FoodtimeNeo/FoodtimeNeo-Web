<script setup>
import { ref, watch } from 'vue';
import {
  fetchManagedItems,
  fetchManagedItem,
  deleteManagedItem,
} from '@/api/admin-manage.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import { statusLabels } from '@/utils/recordLabels.js';
import CatalogEditor from './CatalogEditorFormView.vue';
import ParentPicker from '@/components/admin/ParentPicker.vue';
import MediaImage from '@/components/base/MediaImage.vue';
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
  failure.value = '';
  selected.value = null;
  try {
    editor.value = { item: await fetchManagedItem(type.value, row.id) };
  } catch (error) {
    failure.value = error.message;
  } finally {
    writing.value = false;
  }
}
async function saved() {
  editor.value = null;
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
      :loader="loadParents"
      label="按所属记录筛选"
      optional
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
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <CatalogEditor
      v-if="editor"
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
      <p v-if="row.description" class="description">{{ row.description }}</p>
      <p v-if="type === 'dishes'">{{ formatPrice(row.price) }}</p>
      <p v-else>排序：{{ row.sortOrder }}</p>
      <MediaImage
        v-if="row.coverImageUrl"
        :src="row.coverImageUrl"
        alt="目录封面"
        class="cover"
      />
      <div v-if="selected?.id === row.id">
        <p>确认删除这条目录记录？有关联时后端会阻止删除，可选择编辑并停用。</p>
        <button :disabled="writing" @click="selected = null">取消删除</button
        ><button :disabled="writing" @click="remove">确认删除</button>
      </div>
      <div v-else>
        <button :disabled="writing || !!editor" @click="edit(row)">编辑</button
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
.manage > label {
  display: inline-grid;
  gap: 6px;
  min-width: min(100%, 260px);
  margin: 12px 12px 8px 0;
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
  background: #fffaf0;
}
button {
  margin: 12px 12px 0 0;
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
  margin: 20px 0;
  padding: 20px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
  clip-path: none;
}
article:nth-of-type(even) {
  transform: none;
}
article:nth-of-type(odd) {
  transform: none;
}
h3 {
  margin-top: 0;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.08;
}
article > p {
  margin: 8px 0;
  color: var(--ft-color-text-muted);
}
.description {
  white-space: pre-wrap;
}
.cover {
  width: min(100%, 480px);
  height: 270px;
  margin: 16px 0;
  border: 6px solid #fffaf0;
  box-shadow: 3px 4px 0 rgb(58 36 24 / 18%);
  transform: rotate(-1deg);
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
  .cover {
    height: auto;
    aspect-ratio: 16 / 10;
    object-fit: cover;
  }
}
</style>
