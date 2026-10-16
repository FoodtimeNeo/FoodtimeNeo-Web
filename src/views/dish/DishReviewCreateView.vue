<script setup>
import { nextTick, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchDish } from '@/api/dish.api.js';
import { ApiError } from '@/api/http.js';
import { createReview } from '@/api/review.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import StarRatingInput from '@/components/review/StarRatingInput.vue';
import InkButton from '@/components/base/InkButton.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute();
const router = useRouter();
const params = {
  canteenId: String(route.params.canteenId),
  stallId: String(route.params.stallId),
  dishId: String(route.params.dishId),
};
const {
  data: dish,
  error: targetError,
  loading: targetLoading,
  load,
} = useAsyncData(async (options) => {
  const result = await fetchDish(params.dishId, options);
  if (
    result.id !== params.dishId ||
    result.diningHallId !== params.canteenId ||
    result.stallId !== params.stallId
  )
    throw new ApiError('菜品与当前食堂或档口不匹配', {
      status: 404,
      code: 'NOT_FOUND',
    });
  return result;
});
const submitting = ref(false);
const validationMessage = ref('');
const form = reactive({ rating: 0, content: '' });
const formElement = ref(null);
let active = true;
onUnmounted(() => {
  active = false;
});
async function submitReview() {
  if (
    submitting.value ||
    targetLoading.value ||
    targetError.value ||
    !dish.value
  )
    return;
  validationMessage.value =
    !Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5
      ? '请选择 1–5 星评分'
      : !form.content.trim()
        ? '请填写文字点评'
        : '';
  if (validationMessage.value) {
    await nextTick();
    formElement.value?.querySelector('[role="alert"]')?.focus();
    return;
  }
  submitting.value = true;
  try {
    await createReview({
      dishId: dish.value.id,
      rating: form.rating,
      content: form.content.trim(),
    });
    if (!active) return;
    form.content = '';
    ElMessage.success('点评已提交，审核通过后展示');
    await router.push({ name: 'dishDetail', params });
  } catch (error) {
    if (active)
      validationMessage.value =
        error.message || '提交失败，请先查看个人记录再试';
  } finally {
    if (active) submitting.value = false;
  }
}
</script>
<template>
  <div class="review-create">
    <RouterLink class="review-create__back" :to="{ name: 'dishDetail', params }"
      >← 返回菜品</RouterLink
    >
    <header class="review-create__header">
      <h1 class="section-title">写点评</h1>
      <p>审核通过后展示。</p>
    </header>
    <LoadingState v-if="targetLoading" message="正在读取菜品…" />
    <ErrorState
      v-else-if="targetError"
      :description="targetError.message"
      @retry="load"
    />
    <form
      v-else-if="dish"
      ref="formElement"
      class="review-create__paper"
      novalidate
      @submit.prevent="submitReview"
    >
      <div class="review-create__target">
        <strong>{{ dish.name }}</strong
        ><span>{{ dish.diningHallName }} · {{ dish.stallName }}</span>
      </div>
      <StarRatingInput v-model="form.rating" :disabled="submitting" />
      <label class="review-create__comment"
        ><span>文字点评</span
        ><textarea v-model="form.content" rows="6" :disabled="submitting" />
      </label>
      <p
        v-if="validationMessage"
        class="review-create__message"
        role="alert"
        tabindex="-1"
      >
        {{ validationMessage }}
      </p>
      <div class="review-create__actions">
        <InkButton type="submit" variant="primary" :disabled="submitting">{{
          submitting ? '提交中…' : '提交点评'
        }}</InkButton>
        <RouterLink :to="{ name: 'dishDetail', params }"
          >取消并返回菜品</RouterLink
        >
      </div>
    </form>
  </div>
</template>

<style scoped lang="scss">
.review-create {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-5) auto;

  &__back {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--ft-color-primary);
    font-weight: 700;
  }

  &__header {
    max-width: 760px;

    p {
      color: var(--ft-color-text-muted);
    }
  }

  &__paper {
    display: grid;
    gap: var(--ft-space-3);
    margin-top: var(--ft-space-3);
    padding: var(--ft-space-4);
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card);
    box-shadow: 8px 8px 0 var(--ft-color-text);
  }

  &__target {
    overflow-wrap: anywhere;
    display: flex;
    flex-wrap: wrap;
    gap: var(--ft-space-1);
    align-items: baseline;
    padding: var(--ft-space-2);
    border: 1px dashed var(--ft-color-secondary);
    background: var(--zine-paper-card-alt);

    span {
      color: var(--ft-color-text-muted);
    }
  }

  &__comment {
    display: grid;
    gap: var(--ft-space-1);
    font-weight: 700;

    textarea {
      width: 100%;
      resize: vertical;
      padding: 12px;
      border: 2px solid var(--ft-color-text);
      border-radius: 0;
      background: var(--ft-color-bg-soft);
      color: var(--ft-color-text);
      font: inherit;
    }

    textarea:focus-visible {
      outline: 2px solid var(--ft-color-primary);
      outline-offset: 2px;
    }

    small {
      justify-self: end;
      color: var(--ft-color-text-muted);
      font-weight: 400;
    }
  }

  &__message {
    margin: 0;
    color: var(--ft-color-danger);
    font-weight: 700;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ft-space-2);

    a {
      color: var(--ft-color-primary);
      font-weight: 700;
    }
  }
}

@media (max-width: 768px) {
  .review-create {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);

    &__paper {
      padding: var(--app-mobile-card-padding);
      box-shadow: var(--app-mobile-shadow);
    }
  }
}
</style>
