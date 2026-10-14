<script setup>
import { onUnmounted, ref, useId } from 'vue';
import { validateImageFile } from '@/utils/submissionValidation.js';
const props = defineProps({
  disabled: Boolean,
  required: { type: Boolean, default: true },
  publicationHint: { type: String, default: '审核通过后公开。' },
});
const emit = defineEmits(['change']);
const id = useId();
const preview = ref('');
const error = ref('');
const checking = ref(false);
let version = 0;
let active = true;
function release() {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = '';
}
onUnmounted(() => {
  active = false;
  version++;
  release();
});
async function choose(event) {
  const current = ++version;
  release();
  error.value = '';
  emit('change', null);
  const file = event.target.files?.[0];
  error.value = validateImageFile(file);
  if (error.value) return;
  checking.value = true;
  try {
    const bitmap = await createImageBitmap(file);
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (!active || current !== version) return;
    if (pixels > 20000000) throw new Error('图片不能超过 2000 万像素');
    preview.value = URL.createObjectURL(file);
    emit('change', file);
  } catch (failure) {
    if (active && current === version)
      error.value = failure.message || '无法读取图片';
  } finally {
    if (active && current === version) checking.value = false;
  }
}
</script>
<template>
  <div class="image-field">
    <label :for="id">图片{{ props.required ? '（必填）' : '（选填）' }}</label>
    <input
      :id="id"
      type="file"
      accept="image/jpeg,image/png"
      :disabled="props.disabled"
      :aria-describedby="id + '-help'"
      @change="choose"
    />
    <p :id="id + '-help'">
      JPEG / PNG，最多 10MB、2000 万像素。{{ props.publicationHint }}
    </p>
    <p v-if="checking" role="status">正在检查图片…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <img v-if="preview" :src="preview" alt="所选图片预览" />
  </div>
</template>
<style scoped>
.image-field {
  display: grid;
  gap: 12px;
}
input {
  min-height: 44px;
  max-width: 100%;
}
img {
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  border: 1px solid var(--ft-color-text);
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
