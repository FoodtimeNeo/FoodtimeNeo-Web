<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElDialog, ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchManagedItem, deleteManagedItem } from '@/api/admin-manage.api.js';
import { clearAsyncDataCache } from '@/composables/useAsyncData.js';
import CatalogEditorForm from './CatalogEditorForm.vue';
import CatalogImageManager from './CatalogImageManager.vue';
const props = defineProps({
  type: { type: String, required: true },
  id: { type: String, required: true },
  backTo: { type: Object, required: true },
});
const emit = defineEmits(['updated', 'imagesChanged']);
const auth = useAuthStore(),
  router = useRouter();
const open = ref(false),
  item = ref(null),
  loading = ref(false),
  writing = ref(false),
  error = ref('');
const labels = { 'dining-halls': '食堂', stalls: '档口', dishes: '菜品' };
let epoch = 0;
watch(
  () => [auth.user?.id, auth.isSuperadmin, props.id, props.type],
  () => {
    epoch++;
    open.value = false;
    item.value = null;
  },
);
async function edit() {
  if (!auth.isSuperadmin || loading.value) return;
  const version = ++epoch;
  open.value = true;
  loading.value = true;
  error.value = '';
  item.value = null;
  try {
    const result = await fetchManagedItem(props.type, props.id);
    if (version === epoch && auth.isSuperadmin) item.value = result;
  } catch (failure) {
    if (version === epoch) error.value = failure.message || '无法读取管理资料';
  } finally {
    if (version === epoch) loading.value = false;
  }
}
async function imagesChanged() {
  const version = epoch;
  clearAsyncDataCache();
  emit('imagesChanged');
  try {
    const latest = await fetchManagedItem(props.type, props.id);
    if (version === epoch && auth.isSuperadmin) item.value = latest;
  } catch (failure) {
    if (version === epoch)
      error.value =
        failure.message || '图片已更新，请重新打开管理面板读取最新资料';
  }
}
async function saved(result) {
  clearAsyncDataCache();
  if (result.status === 'inactive') {
    open.value = false;
    await router.replace(props.backTo);
  } else {
    open.value = false;
    emit('updated');
  }
}
async function remove() {
  if (writing.value || !auth.isSuperadmin) return;
  const version = epoch;
  writing.value = true;
  error.value = '';
  try {
    const confirmed = await ElMessageBox.confirm(
      '删除后无法恢复。有关联内容时无法直接删除，可在编辑里停用。',
      `删除${labels[props.type]}`,
      { confirmButtonText: '删除', cancelButtonText: '取消' },
    ).then(
      () => true,
      () => false,
    );
    if (!confirmed || version !== epoch || !auth.isSuperadmin) return;
    await deleteManagedItem(props.type, props.id);
    if (version !== epoch) return;
    clearAsyncDataCache();
    open.value = false;
    await router.replace(props.backTo);
  } catch (failure) {
    if (version === epoch) error.value = failure.message || '删除失败';
  } finally {
    writing.value = false;
  }
}
</script>
<template>
  <div v-if="auth.isSuperadmin" class="catalog-quick-actions">
    <button type="button" class="button-ink" @click="edit">
      管理{{ labels[type] }}
    </button>
    <ElDialog
      v-model="open"
      :title="`管理${labels[type]}`"
      width="min(680px, calc(100vw - 24px))"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
    >
      <p v-if="error" role="alert">
        {{ error }}
        <button v-if="!item" type="button" @click="edit">重试</button>
      </p>
      <p v-if="loading">正在读取管理资料…</p>
      <template v-else-if="item">
        <fieldset :disabled="writing">
          <CatalogEditorForm
            :key="item.id"
            :type="type"
            :item="item"
            @saved="saved"
            @cancel="open = false"
          />
          <CatalogImageManager
            :id="id"
            :key="`${type}:${id}`"
            :type="type"
            @changed="imagesChanged"
          />
          <button
            type="button"
            class="catalog-quick-actions__delete"
            :disabled="writing"
            @click="remove"
          >
            删除{{ labels[type] }}
          </button>
        </fieldset>
      </template>
    </ElDialog>
  </div>
</template>
<style scoped>
.catalog-quick-actions {
  margin-block: 12px;
}
.catalog-quick-actions fieldset {
  min-width: 0;
  padding: 0;
  border: 0;
}
.catalog-quick-actions__delete {
  margin-top: 24px;
  min-height: 44px;
  color: var(--zine-stamp-red);
}
.catalog-quick-actions :deep(.catalog-editor) {
  display: grid;
  gap: 12px;
}
.catalog-quick-actions :deep(.catalog-editor label) {
  display: grid;
  gap: 6px;
}
.catalog-quick-actions :deep(.catalog-editor input),
.catalog-quick-actions :deep(.catalog-editor textarea) {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
}
</style>
