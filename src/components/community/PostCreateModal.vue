<script setup>
import { ref, reactive } from 'vue';
import { ElMessage, ElDialog } from 'element-plus';
import { createCommunityPost } from '@/api/community.api.js';

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'created']);

const submitting = ref(false);
const newImageUrl = ref('');

const form = reactive({
  title: '',
  content: '',
  images: [],
});

// 快速预设图库供测试便捷选择
const sampleImages = [
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
];

function handleClose() {
  emit('update:modelValue', false);
}

function addImage(url) {
  const target = (url || newImageUrl.value).trim();
  if (!target) return;
  if (form.images.length >= 9) {
    ElMessage.warning('最多添加 9 张配图');
    return;
  }
  form.images.push(target);
  newImageUrl.value = '';
}

function removeImage(index) {
  form.images.splice(index, 1);
}

async function handleSubmit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写帖子标题');
    return;
  }
  if (!form.content.trim()) {
    ElMessage.warning('请填写帖子正文');
    return;
  }
  if (form.images.length === 0) {
    ElMessage.warning('请至少添加一张配图（可从下方快捷添加）');
    return;
  }

  submitting.value = true;
  try {
    const post = await createCommunityPost({
      title: form.title.trim(),
      content: form.content.trim(),
      images: form.images,
    });

    // 审核提示：符合用户“新发的帖子需要审核才能展示”的要求
    ElMessage.success({
      message: '发帖成功！内容已提交审核，审核通过后将在社区公开展示。',
      duration: 4000,
    });

    // 重置表单
    form.title = '';
    form.content = '';
    form.images = [];
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
    title="发布社区美食帖"
    width="90%"
    class="post-create-dialog"
    destroy-on-close
    append-to-body
    @close="handleClose"
  >
    <form class="post-create-form" @submit.prevent="handleSubmit">
      <div class="post-create-form__item">
        <label for="post-title" class="post-create-form__label">
          标题 <span class="required">*</span>
        </label>
        <input
          id="post-title"
          v-model="form.title"
          type="text"
          class="post-create-form__input"
          placeholder="给这顿美食起个吸引人的标题吧（如：学一瓦罐汤绝绝子）"
          maxlength="50"
          :disabled="submitting"
        />
      </div>

      <div class="post-create-form__item">
        <label for="post-content" class="post-create-form__label">
          正文心得 <span class="required">*</span>
        </label>
        <textarea
          id="post-content"
          v-model="form.content"
          rows="4"
          class="post-create-form__textarea"
          placeholder="分享你的美食心得、档口位置、推荐吃法..."
          maxlength="1000"
          :disabled="submitting"
        ></textarea>
      </div>

      <div class="post-create-form__item">
        <label class="post-create-form__label">
          配图（最多9张，第一张为封面） <span class="required">*</span>
        </label>

        <!-- 已选配图列表 -->
        <div v-if="form.images.length" class="post-create-form__preview-list">
          <div
            v-for="(img, idx) in form.images"
            :key="idx"
            class="post-create-form__preview-item"
          >
            <img :src="img" alt="配图预览" />
            <span v-if="idx === 0" class="cover-tag">封面</span>
            <button
              type="button"
              class="remove-btn"
              title="移除此图"
              @click="removeImage(idx)"
            >
              ×
            </button>
          </div>
        </div>

        <!-- 图片添加输入框 -->
        <div class="post-create-form__image-input-wrap">
          <input
            v-model="newImageUrl"
            type="url"
            class="post-create-form__input post-create-form__input--url"
            placeholder="粘贴图片 HTTPS 链接..."
            :disabled="submitting"
            @keydown.enter.prevent="addImage()"
          />
          <button
            type="button"
            class="post-create-form__add-img-btn"
            :disabled="submitting || !newImageUrl"
            @click="addImage()"
          >
            + 添加
          </button>
        </div>

        <!-- 快捷预设图片推荐 -->
        <div class="post-create-form__samples">
          <span class="samples-title">快捷选用手账美食配图：</span>
          <div class="samples-row">
            <button
              v-for="(sample, sIdx) in sampleImages"
              :key="sIdx"
              type="button"
              class="sample-thumb"
              title="点击添加该图"
              @click="addImage(sample)"
            >
              <img :src="sample" alt="示例" />
              <span>+</span>
            </button>
          </div>
        </div>
      </div>

      <div class="post-create-form__audit-tip">
        <span
          >💡
          提示：为了营造健康的社区氛围，新发布的帖子将由管理员审核后公开展示。</span
        >
      </div>

      <div class="post-create-form__actions">
        <button
          type="button"
          class="post-create-form__btn post-create-form__btn--cancel"
          :disabled="submitting"
          @click="handleClose"
        >
          取消
        </button>
        <button
          type="submit"
          class="post-create-form__btn post-create-form__btn--submit"
          :disabled="submitting"
        >
          {{ submitting ? '提交中...' : '提交审核发布' }}
        </button>
      </div>
    </form>
  </ElDialog>
</template>

<style scoped lang="scss">
.post-create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 14px;
    font-weight: 700;
    color: var(--ft-color-secondary, #3a2418);

    .required {
      color: var(--ft-color-danger, #c9341e);
    }
  }

  &__input,
  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid var(--ft-color-border, #d5ccbc);
    border-radius: var(--ft-radius-sm, 4px);
    background: var(--ft-color-surface, #f8f5ee);
    color: var(--ft-color-text, #3a2418);
    font-family: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color var(--ft-transition-fast, 180ms ease);

    &:focus {
      border-color: var(--ft-color-primary, #c9341e);
      background: #fff;
    }
  }

  &__preview-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__preview-item {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--ft-color-border, #d5ccbc);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cover-tag {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgb(201 52 30 / 85%);
      color: #fff;
      font-size: 10px;
      text-align: center;
      line-height: 18px;
      font-weight: 700;
    }

    .remove-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgb(0 0 0 / 60%);
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 14px;
      line-height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: var(--ft-color-danger, #c9341e);
      }
    }
  }

  &__image-input-wrap {
    display: flex;
    gap: 8px;
  }

  &__add-img-btn {
    flex: none;
    padding: 0 16px;
    background: var(--ft-color-surface-ink, #f1ece2);
    border: 1px solid var(--ft-color-border, #d5ccbc);
    border-radius: var(--ft-radius-sm, 4px);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    color: var(--ft-color-secondary, #3a2418);

    &:hover:not(:disabled) {
      background: var(--zine-paper-card, #fffaf0);
      border-color: var(--ft-color-primary, #c9341e);
      color: var(--ft-color-primary, #c9341e);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__samples {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    background: var(--zine-paper-card-alt, #f7efd9);
    border-radius: 6px;

    .samples-title {
      font-size: 12px;
      color: var(--ft-color-text-muted, #6e5547);
    }

    .samples-row {
      display: flex;
      gap: 8px;
      overflow-x: auto;
    }

    .sample-thumb {
      position: relative;
      width: 48px;
      height: 48px;
      border: 1px solid var(--ft-color-border, #d5ccbc);
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      background: none;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      span {
        position: absolute;
        inset: 0;
        background: rgb(0 0 0 / 25%);
        color: #fff;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 160ms ease;
      }

      &:hover span {
        opacity: 1;
      }
    }
  }

  &__audit-tip {
    font-size: 12px;
    color: #e6a23c;
    background: rgb(230 162 60 / 10%);
    padding: 8px 12px;
    border-radius: 4px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
  }

  &__btn {
    padding: 9px 20px;
    border-radius: var(--ft-radius-sm, 4px);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--ft-transition-fast, 180ms ease);

    &--cancel {
      background: var(--ft-color-surface-ink, #f1ece2);
      border: 1px solid var(--ft-color-border, #d5ccbc);
      color: var(--ft-color-text-muted, #6e5547);

      &:hover:not(:disabled) {
        background: #fff;
      }
    }

    &--submit {
      background: var(--ft-color-primary, #c9341e);
      border: 1px solid var(--ft-color-primary-strong, #ab1f0b);
      color: #fff;
      box-shadow: 0 4px 0 rgb(171 31 11 / 40%);

      &:hover:not(:disabled) {
        background: var(--ft-color-primary-strong, #ab1f0b);
        transform: translateY(-1px);
      }

      &:active:not(:disabled) {
        transform: translateY(2px);
        box-shadow: none;
      }
    }
  }
}
</style>
