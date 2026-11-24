<script setup>
import { computed } from 'vue';
const props = defineProps({
  text: { type: String, default: '' },
  keyword: { type: String, default: '' },
});
const parts = computed(() => {
  const text = props.text,
    term = props.keyword.trim();
  if (!term) return [{ text, match: false }];
  const pieces = [];
  let start = 0,
    index;
  while (
    (index = text
      .toLocaleLowerCase()
      .indexOf(term.toLocaleLowerCase(), start)) !== -1
  ) {
    if (index > start)
      pieces.push({ text: text.slice(start, index), match: false });
    pieces.push({ text: text.slice(index, index + term.length), match: true });
    start = index + term.length;
  }
  if (start < text.length)
    pieces.push({ text: text.slice(start), match: false });
  return pieces;
});
</script>
<template>
  <span
    ><template v-for="(part, index) in parts" :key="index"
      ><mark v-if="part.match">{{ part.text }}</mark
      ><template v-else>{{ part.text }}</template></template
    ></span
  >
</template>
<style scoped>
mark {
  background: none;
  color: var(--ft-color-primary);
}
</style>
