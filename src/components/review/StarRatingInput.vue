<script setup>
import { computed, nextTick, ref } from 'vue';

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const options = ref(null);
const previewRating = ref(null);
const rating = computed(() =>
  Number.isInteger(props.modelValue) && props.modelValue >= 1
    ? Math.min(props.modelValue, 5)
    : 0,
);
const displayedRating = computed(() =>
  props.disabled ? rating.value : (previewRating.value ?? rating.value),
);

function preview(star, event) {
  if (!props.disabled && event.pointerType !== 'touch')
    previewRating.value = star;
}

function select(nextRating) {
  if (!props.disabled) {
    previewRating.value = null;
    emit('update:modelValue', nextRating);
  }
}

async function onKeydown(event) {
  if (props.disabled) return;
  const previous = rating.value <= 1 ? 5 : rating.value - 1;
  const next = rating.value >= 5 ? 1 : rating.value + 1;
  const nextByKey = {
    ArrowLeft: previous,
    ArrowUp: previous,
    ArrowRight: next,
    ArrowDown: next,
    Home: 1,
    End: 5,
  };
  if (!(event.key in nextByKey)) return;
  event.preventDefault();
  select(nextByKey[event.key]);
  await nextTick();
  options.value
    ?.querySelectorAll('[role="radio"]')
    [nextByKey[event.key] - 1]?.focus();
}
</script>

<template>
  <fieldset class="star-rating" :disabled="disabled">
    <legend>星级评分</legend>
    <div
      ref="options"
      class="star-rating__options"
      role="radiogroup"
      aria-label="星级评分，满分 5 分"
      @keydown="onKeydown"
      @pointerleave="previewRating = null"
    >
      <button
        v-for="star in 5"
        :key="star"
        class="star-rating__star"
        :class="{ 'is-active': star <= displayedRating }"
        type="button"
        role="radio"
        :aria-checked="star === rating"
        :aria-label="`${star} 星`"
        :tabindex="star === (rating || 1) ? 0 : -1"
        :disabled="disabled"
        @pointerenter="preview(star, $event)"
        @click="select(star)"
      >
        <svg
          class="star-rating__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96Z"
            :fill="star <= displayedRating ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
    <output class="star-rating__value" aria-live="polite">
      {{
        previewRating !== null && !disabled
          ? `预览 ${displayedRating} / 5，点击确认`
          : rating
            ? `${rating} / 5`
            : '尚未评分'
      }}
    </output>
  </fieldset>
</template>

<style scoped lang="scss">
.star-rating {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ft-space-1);
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    width: 100%;
    margin-bottom: var(--ft-space-1);
    font-weight: 700;
  }

  &__options {
    display: flex;
    gap: 4px;
  }

  &__star {
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ft-color-text-muted);
    font-size: 34px;
    line-height: 1;
    cursor: pointer;
    transition:
      color var(--ft-transition-fast),
      transform var(--ft-transition-fast);

    &.is-active {
      color: var(--zine-foil-gold);
    }

    &:focus-visible {
      outline: 2px solid var(--ft-color-primary);
      outline-offset: 2px;
    }

    &:hover {
      transform: translateY(-2px) rotate(-4deg);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.6;
    }
  }

  &__icon {
    display: block;
    width: 34px;
    height: 34px;
    margin: auto;
    pointer-events: none;
  }

  &__value {
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }
}
</style>
