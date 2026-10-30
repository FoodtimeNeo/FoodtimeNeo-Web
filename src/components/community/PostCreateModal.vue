<script setup>
import { ref, reactive, watch, onUnmounted } from 'vue';
import { ElMessage, ElDialog } from 'element-plus';
import { createCommunityPost } from '@/api/community.api.js';
import { uploadImage } from '@/api/submission.api.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  initialData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue', 'created']);

const submitting = ref(false);
const fileInputRef = ref(null);
const requestId = ref(crypto.randomUUID());
let submittedPayload = null;

const form = reactive({
  title: '',
  content: '',
});

// 存储已选择的图片项：{ id, file?, previewUrl }
const formImages = ref([]);

function cleanObjectUrls() {
  for (const item of formImages.value) {
    if (item.isBlob && item.previewUrl) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        // 忽略
      }
    }
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      requestId.value = crypto.randomUUID();
      submittedPayload = null;
      cleanObjectUrls();
      formImages.value = [];
      if (props.initialData) {
        form.title = props.initialData.title || '';
        form.content = props.initialData.content || '';
        if (
          props.initialData.images &&
          Array.isArray(props.initialData.images)
        ) {
          formImages.value = props.initialData.images.map((img, i) => {
            const url = typeof img === 'string' ? img : img.url;
            return {
              id: `init-${i}-${Date.now()}`,
              previewUrl: url,
              file: null,
              isBlob: false,
            };
          });
        }
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  cleanObjectUrls();
});

function handleClose() {
  emit('update:modelValue', false);
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

function addFiles(files) {
  if (!files || !files.length) return;
  const remaining = 9 - formImages.value.length;
  if (remaining <= 0) {
    ElMessage.warning('最多添加 9 张配图');
    return;
  }

  const selected = Array.from(files).slice(0, remaining);
  for (const file of selected) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      ElMessage.warning(`文件 ${file.name} 不是支持的图片格式`);
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.warning(`图片 ${file.name} 超过 10MB 限制`);
      continue;
    }

    let previewUrl;
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {
      previewUrl = '';
    }

    formImages.value.push({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl,
      isBlob: true,
    });
  }

  if (files.length > remaining) {
    ElMessage.info(`最多上传 9 张图片，已选取前 ${remaining} 张`);
  }
}

function handleFileSelect(e) {
  addFiles(e.target.files);
}

function handleFileDrop(e) {
  if (submitting.value) return;
  if (e.dataTransfer && e.dataTransfer.files) {
    addFiles(e.dataTransfer.files);
  }
}

function removeImage(index) {
  const removed = formImages.value.splice(index, 1)[0];
  if (removed?.isBlob && removed.previewUrl) {
    try {
      URL.revokeObjectURL(removed.previewUrl);
    } catch {
      // 忽略
    }
  }
}

async function resolveImageUrls() {
  const urls = [];
  for (const item of formImages.value) {
    if (item.file && !item.uploadedUrl) {
      const uploaded = await uploadImage(item.file);
      if (!uploaded?.imageUrl)
        throw new Error('图片上传未返回有效引用，请重试');
      item.uploadedUrl = uploaded.imageUrl;
    }
    urls.push(item.uploadedUrl || item.previewUrl);
  }
  return urls;
}

async function handleSubmit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写手账标题');
    return;
  }
  if (!form.content.trim()) {
    ElMessage.warning('请记录你的美食心得');
    return;
  }
  if (formImages.value.length === 0) {
    ElMessage.warning('请至少上传一张美食实拍图片');
    return;
  }

  if (form.title.trim().length > 50 || form.content.trim().length > 2000) {
    ElMessage.warning('标题最多50字，正文最多2000字');
    return;
  }
  submitting.value = true;
  try {
    const finalImageUrls = await resolveImageUrls();

    const payloadKey = JSON.stringify([
      form.title.trim(),
      form.content.trim(),
      finalImageUrls,
    ]);
    if (submittedPayload && submittedPayload !== payloadKey)
      requestId.value = crypto.randomUUID();
    submittedPayload = payloadKey;
    const post = await createCommunityPost({
      clientRequestId: requestId.value,
      title: form.title.trim(),
      content: form.content.trim(),
      images: finalImageUrls,
    });

    ElMessage.success({
      message: '发帖成功！内容已提交审核，审核通过后将在社区公开展示。',
      duration: 3500,
    });

    // 重置并关闭
    form.title = '';
    form.content = '';
    cleanObjectUrls();
    formImages.value = [];

    emit('created', post);
    emit('update:modelValue', false);
  } catch (error) {
    ElMessage.error(error.message || '发帖失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    class="post-create-dialog"
    destroy-on-close
    append-to-body
    :width="'min(560px, 94vw)'"
    :style="{ boxSizing: 'border-box', maxWidth: 'calc(100% - 32px)' }"
    :show-close="true"
    @close="handleClose"
  >
    <template #header>
      <div class="post-dialog-header">
        <span class="washi-tape" aria-hidden="true"></span>
        <div class="header-main">
          <span class="header-stamp">食记</span>
          <h2 class="header-title">写一页美食手账</h2>
          <img
            src="@/assets/images/decoration02/B/stickers/B_green-tape-strip.png"
            alt=""
            class="header-tape-accent"
            aria-hidden="true"
          />
        </div>
      </div>
    </template>

    <form class="post-create-form" @submit.prevent="handleSubmit">
      <!-- 标题 -->
      <div class="post-create-form__item">
        <div class="item-header">
          <label for="post-title" class="post-create-form__label">
            <span class="label-badge">01</span> 标题
            <span class="required">*</span>
          </label>
          <span class="char-count">{{ form.title.length }}/50</span>
        </div>
        <input
          id="post-title"
          v-model="form.title"
          type="text"
          class="post-create-form__input"
          placeholder="给这顿美食起个吸引人的手账标题吧（如：学一瓦罐汤绝绝子）"
          maxlength="50"
          :disabled="submitting"
        />
      </div>

      <!-- 正文心得 -->
      <div class="post-create-form__item">
        <div class="item-header">
          <label for="post-content" class="post-create-form__label">
            <span class="label-badge">02</span> 美食心得
            <span class="required">*</span>
          </label>
          <span class="char-count">{{ form.content.length }}/2000</span>
        </div>
        <textarea
          id="post-content"
          v-model="form.content"
          rows="4"
          class="post-create-form__textarea"
          placeholder="分享档口位置、推荐吃法、真实口感、排队情况或踩雷提醒..."
          maxlength="2000"
          :disabled="submitting"
        ></textarea>
      </div>

      <!-- 实拍图片上传（真实上传，无链接/无快捷预设） -->
      <div class="post-create-form__item">
        <div class="item-header">
          <label class="post-create-form__label">
            <span class="label-badge">03</span> 美食实拍（最多 9
            张，首张为封面）
            <span class="required">*</span>
          </label>
          <span class="char-count">{{ formImages.length }}/9</span>
        </div>

        <!-- 隐藏的真实文件输入框 -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          class="hidden-file-input"
          :disabled="submitting || formImages.length >= 9"
          @change="handleFileSelect"
        />

        <!-- 图片卡片网格 -->
        <div class="post-photo-grid">
          <div
            v-for="(img, idx) in formImages"
            :key="img.id || idx"
            class="photo-card"
          >
            <img :src="img.previewUrl" alt="实拍预览" />
            <button
              v-if="idx > 0"
              type="button"
              class="photo-card__move"
              :disabled="submitting"
              aria-label="将此图前移"
              @click="
                [formImages[idx - 1], formImages[idx]] = [
                  formImages[idx],
                  formImages[idx - 1],
                ]
              "
            >
              前移
            </button>
            <span v-if="idx === 0" class="photo-card__cover-badge">封面</span>
            <button
              type="button"
              class="photo-card__remove-btn"
              title="移除此图"
              :disabled="submitting"
              @click="removeImage(idx)"
            >
              ×
            </button>
          </div>

          <!-- 上传触发器 -->
          <button
            v-if="formImages.length < 9"
            type="button"
            class="photo-upload-trigger"
            :class="{ 'is-empty': formImages.length === 0 }"
            :disabled="submitting"
            @click="triggerFileInput"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
          >
            <div v-if="formImages.length === 0" class="upload-guide">
              <span class="upload-icon">📸</span>
              <span class="upload-main-text">点击或拖拽上传实拍照片</span>
              <span class="upload-sub-text">支持 JPG、PNG，单张 ≤ 10MB</span>
            </div>
            <div v-else class="upload-add-more">
              <span class="add-icon">＋</span>
              <span class="add-text">添加图片</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 审核提示 -->
      <div class="post-create-form__audit-tip">
        <span class="tip-stamp">保真</span>
        <span class="tip-text">新发布的帖子将在审核通过后展示。</span>
      </div>

      <!-- 操作按钮 -->
      <div class="post-create-form__actions">
        <button
          type="button"
          class="post-btn post-btn--cancel"
          :disabled="submitting"
          @click="handleClose"
        >
          取消
        </button>
        <button
          type="submit"
          class="post-btn post-btn--submit"
          :disabled="submitting || formImages.length === 0"
        >
          <span v-if="submitting">正在发布手账...</span>
          <span v-else>盖章发布</span>
        </button>
      </div>
    </form>
  </ElDialog>
</template>

<style scoped lang="scss">
.photo-card__move {
  position: absolute;
  bottom: 4px;
  left: 4px;
  min-height: 44px;
  padding: 4px 10px;
  cursor: pointer;
}
:deep(.post-create-dialog) {
  --el-dialog-bg-color: var(--zine-paper-card, #fffaf0);
  --el-dialog-padding-primary: 0;

  max-width: 560px;
  border-radius: var(--ft-radius-lg, 16px);
  background: var(--zine-paper-card, #fffaf0);
  border: 2px solid var(--ft-color-secondary, #3a2418);
  box-shadow: 8px 8px 0 var(--ft-color-secondary, #3a2418);
  overflow: hidden;
  margin: 32px auto;

  .el-dialog__header {
    padding: 0;
    margin: 0;
  }

  .el-dialog__body {
    padding: 20px 24px 24px;
    background: var(--zine-paper-card, #fffaf0);
  }

  .el-dialog__headerbtn {
    top: 14px;
    right: 14px;
    font-size: 20px;
    color: var(--ft-color-secondary, #3a2418);
    transition: transform var(--ft-transition-fast, 180ms ease);

    &:hover {
      transform: scale(1.15) rotate(90deg);
      color: var(--ft-color-primary, #c9341e);
    }
  }
}

.post-dialog-header {
  position: relative;
  padding: 22px 24px 14px;
  background: var(--zine-paper-card-alt, #f7efd9);
  border-bottom: 2px dashed var(--ft-color-border, #d5ccbc);

  .washi-tape {
    position: absolute;
    top: -10px;
    left: 45px;
    width: 80px;
    height: 20px;
    background: rgb(213 180 144 / 70%);
    box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
    transform: rotate(-2deg);
    pointer-events: none;
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
  }

  .header-tape-accent {
    width: 48px;
    height: auto;
    opacity: 0.82;
    transform: rotate(8deg);
    pointer-events: none;
    margin-left: auto;
  }

  .header-stamp {
    display: inline-block;
    padding: 2px 7px;
    border: 1.5px solid var(--ft-color-primary, #c9341e);
    border-radius: 4px;
    color: var(--ft-color-primary, #c9341e);
    font-size: 12px;
    font-weight: 900;
    line-height: 1.2;
    transform: rotate(-3deg);
    background: rgb(201 52 30 / 6%);
  }

  .header-title {
    margin: 0;
    font-family: var(--ft-font-family-title, serif);
    font-size: 21px;
    font-weight: 900;
    color: var(--ft-color-secondary, #3a2418);
    letter-spacing: 0.5px;
  }

  .header-subtitle {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--ft-color-text-muted, #6e5547);
  }
}

.post-create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
  }

  &__label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--ft-color-secondary, #3a2418);

    .label-badge {
      display: inline-block;
      font-size: 11px;
      font-family: monospace;
      font-weight: 800;
      color: var(--ft-color-primary, #c9341e);
      background: rgb(201 52 30 / 12%);
      padding: 1px 5px;
      border-radius: 3px;
    }

    .required {
      color: var(--ft-color-danger, #c9341e);
      margin-left: 2px;
    }
  }

  .char-count {
    font-size: 12px;
    color: var(--ft-color-text-muted, #6e5547);
  }

  &__input,
  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1.5px solid var(--ft-color-border, #d5ccbc);
    border-radius: var(--ft-radius-sm, 6px);
    background: #fff;
    color: var(--ft-color-text, #3a2418);
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    outline: none;
    transition: all var(--ft-transition-fast, 180ms ease);

    &:focus {
      border-color: var(--ft-color-primary, #c9341e);
      box-shadow: 0 0 0 2px rgb(201 52 30 / 15%);
    }

    &::placeholder {
      color: #9e8e80;
      font-size: 13px;
    }
  }

  &__textarea {
    resize: vertical;
    min-height: 90px;
  }

  .hidden-file-input {
    display: none;
  }

  /* 图片卡片网格与上传按钮 */
  .post-photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 10px;
    margin-top: 4px;
  }

  .photo-card {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    border: 1.5px solid var(--ft-color-border, #d5ccbc);
    background: #f0ebe1;
    box-shadow: 2px 2px 0 rgb(58 36 24 / 10%);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    &__cover-badge {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgb(201 52 30 / 88%);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
      line-height: 20px;
    }

    &__remove-btn {
      position: absolute;
      top: 3px;
      right: 3px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgb(0 0 0 / 65%);
      color: #fff;
      border: 1px solid #fff;
      font-size: 14px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 160ms ease;

      &:hover {
        background: var(--ft-color-danger, #c9341e);
        transform: scale(1.1);
      }
    }
  }

  .photo-upload-trigger {
    aspect-ratio: 1;
    border: 2px dashed var(--ft-color-border, #d5ccbc);
    border-radius: 8px;
    background: var(--zine-paper-card-alt, #f7efd9);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    transition: all var(--ft-transition-fast, 180ms ease);

    &:hover:not(:disabled) {
      border-color: var(--ft-color-primary, #c9341e);
      background: #fff;
      transform: translateY(-2px);
      box-shadow: 2px 2px 0 var(--ft-color-primary, #c9341e);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.is-empty {
      grid-column: 1 / -1;
      aspect-ratio: auto;
      min-height: 100px;
      padding: 16px;
    }

    .upload-guide {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      text-align: center;

      .upload-icon {
        font-size: 26px;
      }

      .upload-main-text {
        font-size: 14px;
        font-weight: 700;
        color: var(--ft-color-secondary, #3a2418);
      }

      .upload-sub-text {
        font-size: 12px;
        color: var(--ft-color-text-muted, #6e5547);
      }
    }

    .upload-add-more {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      color: var(--ft-color-text-muted, #6e5547);

      .add-icon {
        font-size: 24px;
        font-weight: 700;
        line-height: 1;
      }

      .add-text {
        font-size: 11px;
        font-weight: 700;
      }
    }
  }

  &__audit-tip {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #b05a10;
    background: #fdf5e8;
    border: 1px dashed #e6a23c;
    padding: 8px 12px;
    border-radius: 6px;

    .tip-stamp {
      display: inline-block;
      padding: 1px 4px;
      border: 1px solid #b05a10;
      border-radius: 2px;
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      flex: none;
    }

    .tip-text {
      line-height: 1.4;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 6px;
  }

  .post-btn {
    padding: 9px 22px;
    border-radius: var(--ft-radius-sm, 6px);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--ft-transition-fast, 180ms ease);

    &--cancel {
      background: var(--ft-color-surface-ink, #f1ece2);
      border: 1.5px solid var(--ft-color-border, #d5ccbc);
      color: var(--ft-color-text-muted, #6e5547);

      &:hover:not(:disabled) {
        background: #fff;
        color: var(--ft-color-secondary, #3a2418);
      }
    }

    &--submit {
      background: var(--ft-color-primary, #c9341e);
      border: 1.5px solid var(--ft-color-primary-strong, #ab1f0b);
      color: #fff;
      box-shadow: 4px 4px 0 var(--ft-color-secondary, #3a2418);

      &:hover:not(:disabled) {
        background: var(--ft-color-primary-strong, #ab1f0b);
        transform: translate(-1px, -1px);
        box-shadow: 5px 5px 0 var(--ft-color-secondary, #3a2418);
      }

      &:active:not(:disabled) {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--ft-color-secondary, #3a2418);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }
    }
  }
}
</style>
