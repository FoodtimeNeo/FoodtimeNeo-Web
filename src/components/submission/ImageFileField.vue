<script setup>
import { computed, onUnmounted, ref, useId, watch } from 'vue';
import { validateImageFile } from '@/utils/submissionValidation.js';
const props = defineProps({
  label: { type: String, default: '图片' },
  disabled: Boolean,
  required: { type: Boolean, default: true },
  publicationHint: { type: String, default: '审核通过后公开。' },
  validationMessage: { type: String, default: '' },
  uploadText: { type: String, default: '+ 上传实拍图' },
  helpText: { type: String, default: '' },
});
const emit = defineEmits(['change', 'checking']);
const id = useId();
const input = ref(null);
const preview = ref('');
const error = ref('');
const checking = ref(false);
const hasSelection = ref(false);
const visibleError = computed(() => error.value || props.validationMessage);
watch(checking, (value) => emit('checking', value), { flush: 'sync' });
defineExpose({
  focus: () => input.value?.focus(),
  isValid: () => !visibleError.value && !checking.value,
});
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
  if (props.disabled) return;
  const current = ++version;
  checking.value = false;
  release();
  error.value = '';
  emit('change', null);
  const file = event.target.files?.[0];
  hasSelection.value = Boolean(file);
  if (!file && !props.required) return;
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
function clear() {
  if (props.disabled) return;
  version++;
  checking.value = false;
  release();
  error.value = '';
  hasSelection.value = false;
  if (input.value) input.value.value = '';
  emit('change', null);
  input.value?.focus();
}
function triggerPick() {
  if (props.disabled) return;
  input.value?.click();
}
</script>
<template>
  <div class="image-field">
    <label :for="id" class="image-field__label"
      >{{ props.label }}{{ props.required ? '（必填）' : '（选填）' }}</label
    >
    <input
      :id="id"
      ref="input"
      type="file"
      accept="image/jpeg,image/png"
      class="image-field__native-input"
      :disabled="props.disabled"
      :aria-required="props.required"
      :aria-invalid="Boolean(visibleError)"
      :aria-describedby="`${id}-help${visibleError ? ` ${id}-error` : ''}`"
      @change="choose"
    />
    <div
      v-if="!preview"
      class="image-field__dropzone"
      :class="{ 'is-disabled': props.disabled }"
      tabindex="0"
      role="button"
      :aria-label="props.uploadText"
      @click="triggerPick"
      @keydown.enter.prevent="triggerPick"
      @keydown.space.prevent="triggerPick"
    >
      <div class="image-field__dropzone-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <span class="image-field__dropzone-text">{{ props.uploadText }}</span>
    </div>
    <div v-else class="image-field__preview-card">
      <img :src="preview" alt="所选图片预览" class="image-field__preview-img" />
    </div>
    <p :id="id + '-help'" class="image-field__help">
      {{
        props.helpText ||
        `JPEG / PNG，最多 50MB；超过 10MB 会自动压缩，像素过高会降采样。${props.publicationHint}`
      }}
    </p>
    <p v-if="checking" role="status">正在检查图片…</p>
    <p v-if="visibleError" :id="id + '-error'" role="alert">
      {{ visibleError }}
    </p>
    <button
      v-if="hasSelection"
      type="button"
      class="image-field__clear-btn"
      :disabled="props.disabled"
      @click="clear"
    >
      清除所选图片
    </button>
  </div>
</template>
<style scoped lang="scss">
.image-field {
  display: grid;
  gap: 8px;

  &__label {
    font-weight: 700;
    color: var(--ft-color-text);
    font-size: var(--ft-font-size-sm);
  }

  &__native-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
    opacity: 0;
  }

  &__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px 16px;
    min-height: 104px;
    border: 2px dashed var(--ft-color-secondary, #3a2418);
    border-radius: var(--ft-radius-md, 10px);
    background: var(--zine-paper-card-alt);
    cursor: pointer;
    user-select: none;
    transition:
      border-color var(--ft-transition-fast),
      background var(--ft-transition-fast),
      transform var(--ft-transition-fast),
      box-shadow var(--ft-transition-fast);

    &:hover:not(.is-disabled) {
      border-color: var(--ft-color-primary, #c9341e);
      background: var(--ft-color-surface-ink);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(58, 36, 24, 0.08);

      .image-field__dropzone-icon,
      .image-field__dropzone-text {
        color: var(--ft-color-primary, #c9341e);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--ft-color-primary);
      outline-offset: 2px;
    }

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  &__dropzone-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ft-color-secondary, #3a2418);
    transition: color var(--ft-transition-fast);
  }

  &__dropzone-text {
    font-size: var(--ft-font-size-sm, 14px);
    font-weight: 700;
    color: var(--ft-color-secondary, #3a2418);
    transition: color var(--ft-transition-fast);
  }

  &__help {
    margin: 0;
    font-size: var(--ft-font-size-xs, 12px);
    color: var(--ft-color-text-muted, #6e5547);
    line-height: 1.4;
  }

  &__preview-card {
    display: inline-block;
    max-width: 320px;
    padding: 8px 8px 12px;
    border: 2px solid var(--ft-color-text, #3a2418);
    border-radius: var(--ft-radius-sm, 4px);
    background: var(--zine-paper-card);
    box-shadow: 4px 4px 0 rgba(58, 36, 24, 0.15);
    transform: rotate(-1deg);
  }

  &__preview-img {
    display: block;
    width: 100%;
    max-height: 240px;
    object-fit: cover;
    border: 1px solid var(--ft-color-border, #d5ccbc);
    background: var(--zine-paper-card);
  }

  &__clear-btn {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 6px 14px;
    border: 1.5px solid var(--ft-color-text, #3a2418);
    border-radius: var(--ft-radius-sm, 4px);
    background: var(--zine-paper-card);
    color: var(--ft-color-text, #3a2418);
    font-size: var(--ft-font-size-sm, 14px);
    font-weight: 700;
    cursor: pointer;
    box-shadow: 2px 2px 0 var(--ft-color-text, #3a2418);
    transition:
      transform var(--ft-transition-fast),
      box-shadow var(--ft-transition-fast);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 3px 3px 0 var(--ft-color-text, #3a2418);
      background: var(--ft-color-surface-ink);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  [role='alert'] {
    margin: 0;
    color: var(--ft-color-danger, #c9341e);
    font-size: var(--ft-font-size-sm, 14px);
    font-weight: 700;
  }

  [role='status'] {
    margin: 0;
    color: var(--ft-color-text-muted, #6e5547);
    font-size: var(--ft-font-size-sm, 14px);
  }
}
</style>
