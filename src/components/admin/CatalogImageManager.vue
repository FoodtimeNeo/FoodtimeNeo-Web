<script setup>
import { onUnmounted, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import {
  fetchManagedImages,
  addManagedImage,
  deleteManagedImage,
} from '@/api/admin-manage.api.js';
import { uploadImage } from '@/api/submission.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import ImageFileField from '@/components/submission/ImageFileField.vue';
import MediaImage from '@/components/base/MediaImage.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
const props = defineProps({
  type: { type: String, required: true },
  id: { type: String, required: true },
});
const emit = defineEmits(['changed']);
const auth = useAuthStore();
const images = ref([]),
  total = ref(0),
  page = ref(1),
  loading = ref(false),
  writing = ref(false),
  error = ref('');
const file = ref(null),
  checking = ref(false),
  selectionKey = ref(0);
let epoch = 0,
  reference = '';
onUnmounted(() => {
  epoch++;
});
function choose(value) {
  file.value = value;
  reference = '';
}
async function load() {
  const version = ++epoch,
    actor = auth.user?.id;
  loading.value = true;
  error.value = '';
  try {
    const result = await fetchManagedImages(props.type, props.id, page.value);
    if (version !== epoch || actor !== auth.user?.id || !auth.isSuperadmin)
      return;
    images.value = result.items;
    total.value = result.total;
  } catch (failure) {
    if (version === epoch) error.value = failure.message || '图片读取失败';
  } finally {
    if (version === epoch) loading.value = false;
  }
}
watch(page, load, { immediate: true });
async function add() {
  if (!file.value || checking.value || writing.value || !auth.isSuperadmin)
    return;
  const version = epoch,
    actor = auth.user?.id;
  writing.value = true;
  error.value = '';
  try {
    if (!reference) reference = (await uploadImage(file.value)).imageUrl;
    if (version !== epoch || actor !== auth.user?.id || !auth.isSuperadmin)
      return;
    await addManagedImage(props.type, props.id, reference);
    if (version !== epoch || actor !== auth.user?.id) return;
    file.value = null;
    reference = '';
    selectionKey.value++;
    emit('changed');
    if (page.value !== 1) page.value = 1;
    else await load();
  } catch (failure) {
    if (version === epoch) error.value = failure.message || '添加失败，请重试';
  } finally {
    writing.value = false;
  }
}
async function remove(image) {
  if (writing.value || !auth.isSuperadmin) return;
  const version = epoch,
    actor = auth.user?.id;
  writing.value = true;
  try {
    const confirmed = await ElMessageBox.confirm(
      '此图片将从当前目录移除。',
      '移除图片',
      { confirmButtonText: '移除', cancelButtonText: '取消' },
    ).then(
      () => true,
      () => false,
    );
    if (
      !confirmed ||
      version !== epoch ||
      actor !== auth.user?.id ||
      !auth.isSuperadmin
    )
      return;
    await deleteManagedImage(props.type, props.id, image.id);
    if (version !== epoch || actor !== auth.user?.id) return;
    emit('changed');
    if (images.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (failure) {
    if (version === epoch) error.value = failure.message || '移除失败，请重试';
  } finally {
    writing.value = false;
  }
}
</script>
<template>
  <section class="catalog-images" aria-label="图片管理">
    <h3>{{ type === 'dining-halls' ? '食堂封面' : '图片管理' }}</h3>
    <p v-if="error" role="alert">
      {{ error }}
      <button type="button" :disabled="writing" @click="load">重试</button>
    </p>
    <p v-if="loading">正在读取图片…</p>
    <p v-else-if="!images.length && !error">暂未添加图片</p>
    <ul v-if="images.length" class="catalog-images__grid">
      <li v-for="image in images" :key="image.id">
        <MediaImage :src="image.imageUrl" alt="目录图片" compact />
        <button
          type="button"
          :disabled="writing || loading"
          @click="remove(image)"
        >
          移除图片
        </button>
      </li>
    </ul>
    <PaginationControls
      :page="page"
      :size="12"
      :total="total"
      :disabled="loading || writing"
      @change="page = $event"
    />
    <ImageFileField
      :key="selectionKey"
      :required="false"
      :disabled="writing"
      publication-hint="保存后立即展示。"
      @change="choose"
      @checking="checking = $event"
    />
    <button
      type="button"
      class="button-ink"
      :disabled="!file || checking || writing || loading"
      @click="add"
    >
      {{
        writing ? '处理中…' : type === 'dining-halls' ? '保存封面' : '添加图片'
      }}
    </button>
  </section>
</template>
<style scoped>
.catalog-images {
  padding-top: 16px;
  border-top: 1px solid var(--ft-color-border);
}
.catalog-images__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  padding: 0;
  list-style: none;
}
.catalog-images__grid :deep(.media-image) {
  height: 100px;
  min-height: 0;
}
.catalog-images button {
  min-height: 40px;
  cursor: pointer;
}
</style>
