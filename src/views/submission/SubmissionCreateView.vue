<script setup>
import { computed, nextTick, onUnmounted, reactive, ref, useId } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchCanteen, fetchStalls } from '@/api/canteen.api.js';
import { fetchDish } from '@/api/dish.api.js';
import {
  uploadImage,
  submitPhoto,
  submitDish,
  submitStall,
} from '@/api/submission.api.js';
import { ApiError } from '@/api/http.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { validatePrice } from '@/utils/submissionValidation.js';
import ImageFileField from '@/components/submission/ImageFileField.vue';
import InkButton from '@/components/base/InkButton.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute();
const auth = useAuthStore();
const kind = route.meta.submissionKind;
const title = { photo: '上传菜品图片', dish: '投稿菜品', stall: '投稿档口' }[
  kind
];
const params = { ...route.params };
const {
  data: target,
  loading,
  error,
  load,
} = useAsyncData(async (options) => {
  if (kind === 'stall') return fetchCanteen(params.canteenId, options);
  if (kind === 'dish') {
    const stalls = await fetchStalls(params.canteenId, options);
    const stall = stalls.find((row) => row.id === params.stallId);
    if (stall) return stall;
  } else if (kind === 'photo') {
    const dish = await fetchDish(params.dishId, options);
    if (
      dish.stallId === params.stallId &&
      dish.diningHallId === params.canteenId
    )
      return dish;
  }
  throw new ApiError('投稿目标不存在或与当前页面不匹配', {
    code: 'NOT_FOUND',
    status: 404,
  });
});
const back = computed(() => ({
  name: { photo: 'dishDetail', dish: 'stallDetail', stall: 'canteenDetail' }[
    kind
  ],
  params,
}));
const form = reactive({ name: '', description: '', price: '' });
const fieldId = useId();
const nameInput = ref(null);
const descriptionTextarea = ref(null);
const priceInput = ref(null);
const imageField = ref(null);
const feedback = ref(null);
const errors = reactive({ name: '', description: '', price: '', image: '' });
const validationErrors = computed(() =>
  Object.entries(errors).filter(([, value]) => value),
);
const checkingImage = ref(false);
const file = ref(null);
const message = ref('');
const submitting = ref(false);
const done = ref(false);
let imageUrl = '';
let alive = true;
onUnmounted(() => {
  alive = false;
  file.value = null;
  imageUrl = '';
});
function setFile(value) {
  file.value = value;
  imageUrl = '';
  errors.image = '';
}
function focusField(field) {
  ({
    name: nameInput.value,
    description: descriptionTextarea.value,
    price: priceInput.value,
    image: imageField.value,
  })[field]?.focus();
}
async function submit() {
  if (submitting.value || checkingImage.value || !target.value || done.value)
    return;
  message.value = '';
  errors.name = '';
  errors.description = '';
  errors.price = '';
  errors.image = '';
  if (
    kind !== 'photo' &&
    (!form.name.trim() ||
      form.name.trim().length > (kind === 'dish' ? 120 : 100))
  ) {
    errors.name =
      '请填写有效名称（' + (kind === 'dish' ? 120 : 100) + ' 字以内）';
  }
  errors.description =
    form.description && form.description.trim().length > 500
      ? '简介不能超过 500 字'
      : '';
  if (kind === 'dish') errors.price = validatePrice(form.price);
  if (!file.value) errors.image = '请先选择符合要求的图片';
  if (validationErrors.value.length) {
    await nextTick();
    feedback.value?.focus();
    return;
  }
  const actor = auth.user?.id;
  submitting.value = true;
  try {
    if (!imageUrl) imageUrl = (await uploadImage(file.value)).imageUrl;
    if (!alive || actor !== auth.user?.id) return;
    const body = {
      name: form.name.trim(),
      description: form.description || null,
    };
    if (kind === 'photo') await submitPhoto(target.value.id, { imageUrl });
    else if (kind === 'dish')
      await submitDish(target.value.id, {
        ...body,
        price: form.price === '' ? null : Number(form.price),
        imageUrl,
      });
    else
      await submitStall(target.value.id, { ...body, coverImageUrl: imageUrl });
    if (alive && actor === auth.user?.id) {
      done.value = true;
      file.value = null;
      imageUrl = '';
    }
  } catch (failure) {
    if (alive) {
      message.value = failure.message || '提交失败，请确认结果后再试';
      await nextTick();
      feedback.value?.focus();
    }
  } finally {
    if (alive) submitting.value = false;
  }
}
</script>
<template>
  <div class="submission-page">
    <RouterLink :to="back">← 返回</RouterLink>
    <div class="section-rule">
      <span class="section-rule__index">10</span
      ><span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">{{ title }}</h1>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    />
    <template v-else-if="target">
      <p class="submission-page__target sticker sticker--r-1">
        投稿目标：{{ target.name }}
      </p>
      <div v-if="done" class="submission-page__done torn-edge" role="status">
        <span class="stamp">已提交</span>
        <p class="handwrite">投稿已提交，等待审核。</p>
        <RouterLink :to="{ name: 'mySubmissions', query: { kind } }"
          >查看我的提交</RouterLink
        >
      </div>
      <form v-else novalidate @submit.prevent="submit">
        <div
          v-if="validationErrors.length || message"
          ref="feedback"
          class="submission-page__feedback"
          role="alert"
          tabindex="-1"
        >
          <p v-if="message">{{ message }}</p>
          <template v-else>
            <p>请检查以下内容：</p>
            <ul>
              <li v-for="[field, text] in validationErrors" :key="field">
                <button type="button" @click="focusField(field)">
                  {{ text }}
                </button>
              </li>
            </ul>
          </template>
        </div>
        <template v-if="kind !== 'photo'">
          <label
            >名称<input
              ref="nameInput"
              v-model="form.name"
              :maxlength="kind === 'dish' ? 120 : 100"
              :disabled="submitting"
              :aria-invalid="Boolean(errors.name)"
              :aria-describedby="
                errors.name ? fieldId + '-name-error' : undefined
              "
              required
              @input="errors.name = ''"
          /></label>
          <p
            v-if="errors.name"
            :id="fieldId + '-name-error'"
            class="submission-page__field-error"
          >
            {{ errors.name }}
          </p>
          <label
            >简介（选填）<textarea
              ref="descriptionTextarea"
              v-model="form.description"
              :disabled="submitting"
              rows="4"
              maxlength="500"
              :aria-invalid="Boolean(errors.description)"
              :aria-describedby="
                errors.description ? fieldId + '-description-error' : undefined
              "
              @input="errors.description = ''"
            />
          </label>
          <p
            v-if="errors.description"
            :id="fieldId + '-description-error'"
            class="submission-page__field-error"
          >
            {{ errors.description }}
          </p>
          <label v-if="kind === 'dish'"
            >参考价格（选填）<input
              ref="priceInput"
              v-model="form.price"
              inputmode="decimal"
              :disabled="submitting"
              :aria-invalid="Boolean(errors.price)"
              :aria-describedby="
                errors.price ? fieldId + '-price-error' : undefined
              "
              placeholder="留空由审核人补充"
              @input="errors.price = ''"
          /></label>
          <p
            v-if="errors.price"
            :id="fieldId + '-price-error'"
            class="submission-page__field-error"
          >
            {{ errors.price }}
          </p>
        </template>
        <ImageFileField
          ref="imageField"
          :disabled="submitting"
          :validation-message="errors.image"
          @change="setFile"
          @checking="checkingImage = $event"
        />
        <InkButton
          type="submit"
          variant="primary"
          :disabled="submitting || checkingImage"
          >{{
            submitting
              ? '提交中…'
              : checkingImage
                ? '正在检查图片…'
                : '提交审核'
          }}</InkButton
        >
      </form>
    </template>
  </div>
</template>
<style scoped>
.submission-page {
  width: min(100%, 760px);
  padding: var(--ft-space-3);
  margin: auto;
  overflow-wrap: anywhere;
}
.submission-page__target {
  width: fit-content;
  margin: var(--ft-space-2) 0;
}
.submission-page__done {
  margin: var(--ft-space-3) 0;
  padding: var(--ft-space-3);
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 16%);
}
.submission-page__done p {
  margin: var(--ft-space-2) 0;
  color: var(--ft-color-primary);
  font-size: 24px;
}
form {
  display: grid;
  gap: 20px;
  margin-top: var(--ft-space-3);
  padding: var(--ft-space-4);
  border: 2px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 6px 6px 0 rgb(58 36 24 / 16%);
}
label {
  display: grid;
  gap: 8px;
  font-weight: 700;
}
input,
textarea {
  padding: 12px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  width: 100%;
  min-height: 44px;
  border-radius: 0;
  box-shadow: 2px 2px 0 rgb(58 36 24 / 16%);
}
[role='alert'],
.submission-page__field-error {
  color: var(--ft-color-danger);
}
.submission-page__feedback {
  padding: 12px;
  border: 1px dashed var(--ft-color-danger);
  background: var(--zine-stamp-red-soft);
}
.submission-page__feedback button {
  min-height: 44px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  text-decoration: underline;
}
.submission-page__field-error {
  margin: -12px 0 0;
}

@media (max-width: 768px) {
  form {
    padding: var(--app-mobile-card-padding);
    box-shadow: var(--app-mobile-shadow);
  }
}
</style>
