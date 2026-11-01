<script setup>
import { onUnmounted, reactive, ref } from 'vue';
import { saveManagedItem, fetchManagedItems } from '@/api/admin-manage.api.js';
import { uploadImage } from '@/api/submission.api.js';
import { validatePrice } from '@/utils/submissionValidation.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import ParentPicker from '@/components/admin/ParentPicker.vue';
import ImageFileField from '@/components/submission/ImageFileField.vue';
import MediaImage from '@/components/base/MediaImage.vue';
const props = defineProps({
  type: { type: String, required: true },
  item: { type: Object, default: null },
});
const emit = defineEmits(['saved', 'cancel']);
const auth = useAuthStore();
const loadParents = (page, options) =>
  fetchManagedItems(
    props.type === 'stalls' ? 'dining-halls' : 'stalls',
    page,
    '',
    options,
  );
const form = reactive({
  parentId: props.item?.parentId || '',
  name: props.item?.name || '',
  description: props.item?.description || '',
  price: props.item?.price === null ? '' : String(props.item?.price ?? ''),
  status: props.item?.status || 'active',
  sortOrder: String(props.item?.sortOrder ?? 0),
});
const file = ref(null);
const removeCover = ref(false);
const writing = ref(false);
const error = ref('');
let reference = '';
let active = true;
onUnmounted(() => {
  active = false;
  file.value = null;
  reference = '';
});
function chooseFile(value) {
  file.value = value;
  reference = '';
  if (value) removeCover.value = false;
}
async function submit() {
  if (writing.value) return;
  error.value = '';
  if (
    !form.name.trim() ||
    form.name.trim().length > (props.type === 'dishes' ? 120 : 100)
  ) {
    error.value = '请填写有效名称';
    return;
  }
  if (props.type !== 'dining-halls' && !form.parentId) {
    error.value = '请选择所属记录';
    return;
  }
  if (form.description && form.description.trim().length > 500) {
    error.value = '简介不能超过 500 字';
    return;
  }
  if (
    props.type === 'dishes' &&
    validatePrice(form.price, { required: true })
  ) {
    error.value = validatePrice(form.price, { required: true });
    return;
  }
  if (
    props.type !== 'dishes' &&
    (!/^-?\d+$/.test(form.sortOrder) ||
      Number(form.sortOrder) < -2147483648 ||
      Number(form.sortOrder) > 2147483647)
  ) {
    error.value = '排序值须为 32 位整数';
    return;
  }
  const actor = auth.user?.id;
  writing.value = true;
  try {
    if (file.value && !reference)
      reference = (await uploadImage(file.value)).imageUrl;
    if (!active || actor !== auth.user?.id) return;
    const result = await saveManagedItem(props.type, props.item?.id || '', {
      ...form,
      name: form.name.trim(),
      description: form.description || null,
      price: props.type === 'dishes' ? Number(form.price) : undefined,
      sortOrder: Number(form.sortOrder),
      coverImageUrl: removeCover.value
        ? null
        : reference || props.item?.coverImageUrl || null,
    });
    if (active) emit('saved', result);
  } catch (failure) {
    if (active) error.value = failure.message || '保存失败，请确认结果后再试';
  } finally {
    if (active) writing.value = false;
  }
}
</script>
<template>
  <form class="editor" @submit.prevent="submit">
    <h3>
      {{ item ? '编辑' : '新增'
      }}{{ { 'dining-halls': '食堂', stalls: '档口', dishes: '菜品' }[type] }}
    </h3>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="item && type !== 'dining-halls'">
      所属 ID：{{ item.parentId }}（保持原归属）
    </p>
    <ParentPicker
      v-else-if="type !== 'dining-halls'"
      v-model="form.parentId"
      :loader="loadParents"
      :disabled="writing"
    />
    <label
      >名称<input
        v-model="form.name"
        :maxlength="type === 'dishes' ? 120 : 100"
        :disabled="writing"
        required
    /></label>
    <label
      >简介<textarea
        v-model="form.description"
        :disabled="writing"
        rows="3"
        maxlength="500"
      />
    </label>
    <label v-if="type === 'dishes'"
      >价格<input v-model="form.price" inputmode="decimal" :disabled="writing"
    /></label>
    <template v-else>
      <label
        >排序值<input
          v-model="form.sortOrder"
          inputmode="numeric"
          :disabled="writing"
      /></label>
      <MediaImage
        v-if="item?.coverImageUrl && !removeCover"
        :src="item.coverImageUrl"
        alt="现有封面"
        class="cover"
      />
      <label v-if="item?.coverImageUrl"
        >移除现有封面<input
          v-model="removeCover"
          type="checkbox"
          :disabled="writing"
      /></label>
      <ImageFileField
        :disabled="writing"
        :required="false"
        publication-hint="封面保存后随启用目录展示。"
        @change="chooseFile"
      />
      <p>目录封面可留空；选择图片后将上传本人文件。</p>
    </template>
    <label
      >状态<select v-model="form.status" :disabled="writing">
        <option value="active">启用</option>
        <option value="inactive">停用</option>
      </select></label
    >
    <div>
      <button type="button" :disabled="writing" @click="emit('cancel')">
        取消</button
      ><button type="submit" :disabled="writing">
        {{ writing ? '保存中…' : '保存' }}
      </button>
    </div>
  </form>
</template>
<style scoped>
.editor {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 2px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
label {
  display: grid;
  gap: 8px;
}
input,
select,
textarea,
button {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
button {
  margin-right: 12px;
  cursor: pointer;
}
.cover {
  width: min(100%, 480px);
  height: 270px;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
