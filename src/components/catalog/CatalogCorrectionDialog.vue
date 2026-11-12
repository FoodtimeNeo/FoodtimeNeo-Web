<script setup>
import { reactive, ref, watch } from 'vue';
import { ElDialog, ElMessage } from 'element-plus';
import { uploadImage } from '@/api/submission.api.js';
import { createCatalogCorrection } from '@/api/correction.api.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  target: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'submitted']);

const selected = reactive({ name: false, description: false, price: false });
const values = reactive({ name: '', description: '', price: '' });
const reason = ref('');
const requestKey = ref('');
const evidence = ref([]);
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');

function reset() {
  selected.name = false;
  selected.description = false;
  selected.price = false;
  values.name = props.target?.name || '';
  values.description = props.target?.description || '';
  values.price =
    props.target?.price === null || props.target?.price === undefined
      ? ''
      : String(props.target.price);
  reason.value = '';
  requestKey.value = newKey();
  evidence.value = [];
  error.value = '';
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset();
  },
  { immediate: true },
);

function close() {
  emit('update:modelValue', false);
}

function changedFields() {
  const fields = [];
  if (selected.name) fields.push('name');
  if (selected.description) fields.push('description');
  if (props.target?.type === 'dish' && selected.price) fields.push('price');
  return fields;
}

async function addEvidence(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;
  if (evidence.value.length + files.length > 3) {
    error.value = '证据图片最多3张';
    return;
  }
  uploading.value = true;
  error.value = '';
  try {
    for (const file of files) {
      const uploaded = await uploadImage(file);
      evidence.value.push({ url: uploaded.imageUrl, name: file.name });
    }
  } catch (uploadError) {
    error.value = uploadError.message || '证据上传失败';
  } finally {
    uploading.value = false;
  }
}

function removeEvidence(index) {
  evidence.value.splice(index, 1);
}

function newKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function submit() {
  const fields = changedFields();
  if (!fields.length) {
    error.value = '请至少勾选一个要更正的字段';
    return;
  }
  if (!reason.value.trim()) {
    error.value = '请填写更正理由';
    return;
  }
  if (!props.target?.id || !props.target?.revision) {
    error.value = '无法读取目录版本，请刷新后重试';
    return;
  }
  const payload = {
    targetType: props.target.type,
    targetId: props.target.id,
    baseRevision: props.target.revision,
    changedFields: fields,
    reason: reason.value.trim(),
    evidenceUrls: evidence.value.map((item) => item.url),
    idempotencyKey: requestKey.value,
  };
  if (selected.name) payload.name = values.name.trim();
  if (selected.description) payload.description = values.description.trim();
  if (selected.price)
    payload.price = values.price === '' ? null : Number(values.price);
  submitting.value = true;
  error.value = '';
  try {
    const result = await createCatalogCorrection(payload);
    ElMessage.success('纠错提案已提交，等待管理员核对');
    emit('submitted', result);
    close();
  } catch (submitError) {
    error.value = submitError.message || '提交失败，请重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    title="目录纠错"
    width="min(560px, 94vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="target" class="correction-form">
      <p class="correction-form__target">
        当前资料：<strong>{{ target.summary || target.name }}</strong>
      </p>
      <p class="correction-form__hint">
        只提交你确认需要更正的字段；每个字段都会显示改前与改后。
      </p>

      <label class="correction-form__check">
        <input v-model="selected.name" type="checkbox" />
        更正名称
      </label>
      <input
        v-if="selected.name"
        v-model="values.name"
        :maxlength="target.type === 'dish' ? 120 : 100"
        aria-label="更正后的名称"
      />

      <label class="correction-form__check">
        <input v-model="selected.description" type="checkbox" />
        更正文字介绍
      </label>
      <textarea
        v-if="selected.description"
        v-model="values.description"
        rows="4"
        maxlength="500"
        aria-label="更正后的介绍"
      />

      <template v-if="target.type === 'dish'">
        <label class="correction-form__check">
          <input v-model="selected.price" type="checkbox" />
          更正价格
        </label>
        <input
          v-if="selected.price"
          v-model="values.price"
          type="number"
          min="0"
          step="0.01"
          placeholder="留空表示价格未知"
          aria-label="更正后的价格"
        />
      </template>

      <label class="correction-form__label" for="correction-reason">
        更正理由
      </label>
      <textarea
        id="correction-reason"
        v-model="reason"
        rows="3"
        maxlength="500"
        placeholder="请说明依据，例如菜单已更新"
      />

      <label class="correction-form__label" for="correction-evidence">
        证据图片（可选，最多3张）
      </label>
      <input
        id="correction-evidence"
        type="file"
        accept="image/jpeg,image/png"
        multiple
        :disabled="uploading || evidence.length >= 3"
        @change="addEvidence"
      />
      <p v-if="uploading" class="correction-form__hint">正在上传证据…</p>
      <ul v-if="evidence.length" class="correction-form__evidence">
        <li v-for="(item, index) in evidence" :key="item.url">
          <img :src="item.url" :alt="item.name" />
          <button type="button" @click="removeEvidence(index)">移除</button>
        </li>
      </ul>
      <p class="correction-form__hint">
        证据仅你和审核人员可见，不会自动加入目录图片。
      </p>

      <p v-if="error" role="alert" class="correction-form__error">
        {{ error }}
      </p>
    </div>

    <template #footer>
      <button type="button" class="button-ink" @click="close">取消</button>
      <button
        type="button"
        class="button-ink is-primary"
        :disabled="submitting || uploading"
        @click="submit"
      >
        {{ submitting ? '提交中…' : '提交纠错' }}
      </button>
    </template>
  </ElDialog>
</template>

<style scoped lang="scss">
.correction-form {
  display: grid;
  gap: 8px;

  &__target {
    margin: 0;
    padding: 8px;
    background: var(--ft-color-surface-alt, #f7f1e3);
    overflow-wrap: anywhere;
  }

  &__hint {
    margin: 0;
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }

  &__check {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-weight: 700;
  }

  &__label {
    margin-top: 6px;
    font-weight: 700;
  }

  input:not([type='checkbox']),
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px;
    border: 1px solid var(--ft-color-secondary);
    background: var(--ft-color-surface);
    font: inherit;
  }

  &__evidence {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;

    li {
      display: grid;
      gap: 4px;
    }

    img {
      width: 88px;
      height: 88px;
      object-fit: cover;
      border: 1px solid var(--ft-color-secondary);
    }
  }

  &__error {
    margin: 0;
    color: var(--ft-color-danger);
  }
}
</style>
