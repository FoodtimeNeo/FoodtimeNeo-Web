<script setup>
import { onScopeDispose, ref, watch } from 'vue';

const props = defineProps({
  target: { type: Object, required: true },
  save: { type: Function, required: true },
});
const liked = ref(false);
const count = ref(0);
const version = ref(-1);
const busy = ref(false);
const error = ref('');
let generation = 0;
watch(
  () => [props.target.id, props.target.counterVersion],
  ([, incoming]) => {
    if ((incoming ?? 0) >= version.value) {
      liked.value = !!props.target.likedByMe;
      count.value = props.target.likeCount ?? 0;
      version.value = incoming ?? 0;
    }
  },
  { immediate: true },
);
onScopeDispose(() => generation++);
async function change() {
  if (busy.value) return;
  const ticket = generation;
  busy.value = true;
  error.value = '';
  try {
    const result = await props.save(!liked.value);
    if (ticket !== generation) return;
    if (result.counterVersion >= version.value) {
      liked.value = result.likedByMe;
      count.value = result.likeCount;
      version.value = result.counterVersion;
    }
  } catch (failure) {
    if (ticket === generation)
      error.value = failure.message || '操作失败，请重试';
  } finally {
    if (ticket === generation) busy.value = false;
  }
}
</script>

<template>
  <div class="comment-like">
    <button
      type="button"
      class="review-action"
      :aria-pressed="liked"
      :aria-busy="busy"
      :disabled="busy"
      @click="change"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M7 9h-3v8h3m0-8 4-6c2 0 2 2 1 5h4c1 0 1 1 1 2l-1 6c0 1-1 1-2 1H7Z"
        />
      </svg>
      {{ busy ? '处理中…' : liked ? '已赞' : '赞' }} {{ count }}
    </button>
    <p v-if="error" class="comment-like__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped lang="scss">
.comment-like {
  button {
    min-height: 44px;
    min-width: 72px;
  }
  button[aria-pressed='true'] {
    color: var(--ft-color-primary);
  }
  &__error {
    margin: 0;
    color: var(--ft-color-danger);
    font-size: var(--ft-font-size-sm);
    overflow-wrap: anywhere;
  }
}
</style>
