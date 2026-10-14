<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchCanteens, fetchStalls } from '@/api/canteen.api.js';
import { createReview } from '@/api/review.api.js';
import ReviewTargetPicker from '@/components/review/ReviewTargetPicker.vue';
import StarRatingInput from '@/components/review/StarRatingInput.vue';
import InkButton from '@/components/base/InkButton.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const route = useRoute();
const router = useRouter();

const canteens = ref([]);
const stalls = ref([]);
const targetLoading = ref(true);
const targetError = ref(null);
const submitting = ref(false);
const validationMessage = ref('');
const target = ref({ canteenId: '', stallId: '', dishId: '' });
const form = reactive({ rating: 0, comment: '' });

const selectedStall = computed(
  () =>
    stalls.value.find(
      (stall) => String(stall.id) === String(target.value.stallId),
    ) ?? null,
);
const dishes = computed(() => selectedStall.value?.dishes ?? []);
const selectedDish = computed(
  () =>
    dishes.value.find(
      (dish) => String(dish.id) === String(target.value.dishId),
    ) ?? null,
);
const selectedCanteen = computed(
  () =>
    canteens.value.find(
      (canteen) => String(canteen.id) === String(target.value.canteenId),
    ) ?? null,
);

async function loadStalls(canteenId, preferred = {}) {
  stalls.value = [];
  if (!canteenId) return;
  targetLoading.value = true;
  targetError.value = null;
  try {
    stalls.value = await fetchStalls(canteenId);
    const preferredDishId = String(preferred.dishId ?? '');
    const matchedStall = preferredDishId
      ? stalls.value.find((stall) =>
          (stall.dishes ?? []).some(
            (dish) => String(dish.id) === preferredDishId,
          ),
        )
      : stalls.value.find(
          (stall) => String(stall.id) === String(preferred.stallId ?? ''),
        );
    if (matchedStall) {
      target.value = {
        canteenId: String(canteenId),
        stallId: String(matchedStall.id),
        dishId: preferredDishId,
      };
    }
  } catch (error) {
    targetError.value = error;
  } finally {
    targetLoading.value = false;
  }
}

async function loadTargets() {
  targetLoading.value = true;
  targetError.value = null;
  try {
    canteens.value = await fetchCanteens();
    const canteenId = String(route.query.canteenId ?? '');
    if (canteenId) {
      target.value = { canteenId, stallId: '', dishId: '' };
      await loadStalls(canteenId, {
        stallId: route.query.stallId,
        dishId: route.query.dishId,
      });
    }
  } catch (error) {
    targetError.value = error;
  } finally {
    targetLoading.value = false;
  }
}

async function updateTarget(nextTarget) {
  validationMessage.value = '';
  const canteenChanged = nextTarget.canteenId !== target.value.canteenId;
  target.value = nextTarget;
  if (canteenChanged) await loadStalls(nextTarget.canteenId);
}

function validate() {
  const comment = form.comment.trim();
  if (!selectedDish.value) return '请先选择要点评的食堂、档口和菜品。';
  if (form.rating < 1 || form.rating > 5) return '请选择 1–5 星评分。';
  if (!comment) return '请填写文字点评。';
  return '';
}

async function submitReview() {
  if (submitting.value) return;
  validationMessage.value = validate();
  if (validationMessage.value) return;

  submitting.value = true;
  try {
    await createReview({
      dishId: target.value.dishId,
      rating: form.rating,
      comment: form.comment.trim(),
    });
    ElMessage.success('点评已提交，审核通过后将公开展示');
    await router.push({
      name: 'dishDetail',
      params: {
        canteenId: target.value.canteenId,
        dishId: target.value.dishId,
      },
    });
  } catch (error) {
    validationMessage.value = error.message || '提交失败，请稍后重试。';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadTargets);
</script>

<template>
  <main class="review-create">
    <header class="review-create__header">
      <span class="stamp">点评投稿</span>
      <h1 class="section-title">写下这口的真实感受</h1>
      <p>评分与文字点评提交后需要审核，审核通过后才会公开展示。</p>
    </header>

    <LoadingState
      v-if="targetLoading && !canteens.length"
      message="正在翻菜单…"
    />
    <ErrorState
      v-else-if="targetError"
      title="暂时无法加载菜单"
      :description="targetError.message"
      @retry="loadTargets"
    />
    <form v-else class="review-create__paper" @submit.prevent="submitReview">
      <ReviewTargetPicker
        :model-value="target"
        :canteens="canteens"
        :stalls="stalls"
        :dishes="dishes"
        :loading="targetLoading"
        @update:model-value="updateTarget"
      />

      <div v-if="selectedDish" class="review-create__target">
        <strong>{{ selectedDish.name }}</strong>
        <span>{{ selectedCanteen?.name }} · {{ selectedStall?.name }}</span>
      </div>

      <StarRatingInput v-model="form.rating" :disabled="submitting" />

      <label class="review-create__comment">
        <span>文字点评</span>
        <textarea
          v-model="form.comment"
          rows="6"
          maxlength="220"
          placeholder="可以写味道、分量、出餐速度和排队情况。"
          :disabled="submitting"
        />
        <small>{{ form.comment.length }} / 220</small>
      </label>

      <p v-if="validationMessage" class="review-create__message" role="alert">
        {{ validationMessage }}
      </p>

      <div class="review-create__actions">
        <InkButton type="submit" variant="primary" :disabled="submitting">
          {{ submitting ? '提交中…' : '提交点评' }}
        </InkButton>
        <RouterLink
          v-if="target.canteenId && target.dishId"
          :to="{
            name: 'dishDetail',
            params: {
              canteenId: target.canteenId,
              dishId: target.dishId,
            },
          }"
        >
          返回菜品详情
        </RouterLink>
      </div>
    </form>
  </main>
</template>

<style scoped lang="scss">
.review-create {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-5) auto;

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
