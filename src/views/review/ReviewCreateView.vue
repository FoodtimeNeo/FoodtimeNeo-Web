<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  fetchCanteens,
  fetchStalls,
  fetchStallDishes,
} from '@/api/canteen.api.js';
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
const dishes = ref([]);
const targetLoading = ref(false);
const targetError = ref(null);
const submitting = ref(false);
const validationMessage = ref('');
const target = ref({ canteenId: '', stallId: '', dishId: '' });
const form = reactive({ rating: 0, content: '' });
const formElement = ref(null);
let selectionVersion = 0;
const selectedCanteen = computed(() =>
  canteens.value.find((item) => item.id === target.value.canteenId),
);
const selectedStall = computed(() =>
  stalls.value.find((item) => item.id === target.value.stallId),
);
const selectedDish = computed(() =>
  dishes.value.find((item) => item.id === target.value.dishId),
);
async function loadSelection(preferred = {}) {
  const version = ++selectionVersion;
  targetLoading.value = true;
  targetError.value = null;
  try {
    const halls = await fetchCanteens();
    if (version !== selectionVersion) return;
    canteens.value = halls;
    if (!halls.some((hall) => hall.id === target.value.canteenId)) {
      target.value = { canteenId: '', stallId: '', dishId: '' };
      stalls.value = [];
      dishes.value = [];
      return;
    }
    const loadedStalls = await fetchStalls(target.value.canteenId);
    if (version !== selectionVersion) return;
    stalls.value = loadedStalls;
    const wanted = preferred.stallId || target.value.stallId;
    if (!loadedStalls.some((stall) => stall.id === wanted)) {
      target.value.stallId = '';
      target.value.dishId = '';
      dishes.value = [];
      return;
    }
    target.value.stallId = wanted;
    const loadedDishes = await fetchStallDishes(wanted);
    if (version !== selectionVersion) return;
    dishes.value = loadedDishes;
    const wantedDish = preferred.dishId || target.value.dishId;
    target.value.dishId = loadedDishes.some(
      (dish) => dish.id === wantedDish && dish.stallId === wanted,
    )
      ? wantedDish
      : '';
  } catch (error) {
    if (version === selectionVersion) targetError.value = error;
  } finally {
    if (version === selectionVersion) targetLoading.value = false;
  }
}
async function updateTarget(next) {
  if (submitting.value) return;
  const previous = target.value;
  target.value = { ...next };
  validationMessage.value = '';
  if (
    previous.canteenId !== next.canteenId ||
    previous.stallId !== next.stallId
  ) {
    dishes.value = [];
    if (previous.canteenId !== next.canteenId) stalls.value = [];
    await loadSelection();
  }
}
async function submitReview() {
  if (submitting.value || targetLoading.value) return;
  validationMessage.value = !selectedDish.value
    ? '请先选择食堂、档口和菜品'
    : !Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5
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
  const submittedTarget = { ...target.value };
  try {
    await createReview({
      dishId: submittedTarget.dishId,
      rating: form.rating,
      content: form.content.trim(),
    });
    form.content = '';
    ElMessage.success('点评已提交，审核通过后展示');
    await router.push({ name: 'dishDetail', params: submittedTarget });
  } catch (error) {
    validationMessage.value = error.message || '提交失败，请先查看个人记录再试';
  } finally {
    submitting.value = false;
  }
}
onMounted(() => {
  target.value = {
    canteenId: String(route.query.canteenId || ''),
    stallId: String(route.query.stallId || ''),
    dishId: String(route.query.dishId || ''),
  };
  loadSelection({ ...target.value });
});
</script>
<template>
  <div class="review-create">
    <header class="review-create__header">
      <h1 class="section-title">写点评</h1>
      <p>审核通过后展示。</p>
    </header>
    <LoadingState v-if="targetLoading && !canteens.length" />
    <ErrorState
      v-else-if="targetError"
      :description="targetError.message"
      @retry="loadSelection(target)"
    />
    <form
      v-else
      ref="formElement"
      class="review-create__paper"
      @submit.prevent="submitReview"
    >
      <ReviewTargetPicker
        :model-value="target"
        :canteens="canteens"
        :stalls="stalls"
        :dishes="dishes"
        :loading="targetLoading || submitting"
        @update:model-value="updateTarget"
      />
      <div v-if="selectedDish" class="review-create__target">
        <strong>{{ selectedDish.name }}</strong
        ><span>{{ selectedCanteen?.name }} · {{ selectedStall?.name }}</span>
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
        <InkButton
          type="submit"
          variant="primary"
          :disabled="submitting || targetLoading"
          >{{ submitting ? '提交中…' : '提交点评' }}</InkButton
        >
        <RouterLink
          v-if="selectedDish"
          :to="{ name: 'dishDetail', params: target }"
          >返回菜品</RouterLink
        >
      </div>
    </form>
  </div>
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
