<script setup>
import { computed, onUnmounted, reactive, ref } from 'vue';
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
}
async function submit() {
  if (submitting.value || !target.value || done.value) return;
  message.value = '';
  if (
    kind !== 'photo' &&
    (!form.name.trim() ||
      form.name.trim().length > (kind === 'dish' ? 120 : 100))
  ) {
    message.value =
      '请填写有效名称（' + (kind === 'dish' ? 120 : 100) + ' 字以内）';
    return;
  }
  if (kind === 'dish' && validatePrice(form.price)) {
    message.value = validatePrice(form.price);
    return;
  }
  if (!file.value) {
    message.value = '请先选择符合要求的图片';
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
    if (alive) message.value = failure.message || '提交失败，请确认结果后再试';
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
        <RouterLink :to="{ name: 'mySubmissions' }">查看我的提交</RouterLink>
      </div>
      <form v-else @submit.prevent="submit">
        <p v-if="message" role="alert">{{ message }}</p>
        <template v-if="kind !== 'photo'">
          <label
            >名称<input
              v-model="form.name"
              :maxlength="kind === 'dish' ? 120 : 100"
              :disabled="submitting"
              required
          /></label>
          <label
            >简介（选填）<textarea
              v-model="form.description"
              :disabled="submitting"
              rows="4"
            />
          </label>
          <label v-if="kind === 'dish'"
            >参考价格（选填）<input
              v-model="form.price"
              inputmode="decimal"
              :disabled="submitting"
              placeholder="留空由审核人补充"
          /></label>
        </template>
        <ImageFileField :disabled="submitting" @change="setFile" />
        <InkButton type="submit" variant="primary" :disabled="submitting">{{
          submitting ? '提交中…' : '提交审核'
        }}</InkButton>
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
}
label {
  display: grid;
  gap: 8px;
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
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
