<script setup>
defineProps({ items: { type: Array, default: () => [] } });
defineEmits(['open']);
</script>
<template>
  <section v-if="items.length" class="community-pins" aria-label="置顶食记">
    <h2>置顶食记</h2>
    <ol>
      <li v-for="post in items" :key="post.id">
        <button type="button" @click="$emit('open', post)">
          <span class="community-pins__stamp">置顶</span>
          <span class="community-pins__copy"
            ><strong>{{ post.title }}</strong
            ><small>@{{ post.userDisplayName || '校园干饭人' }}</small></span
          >
        </button>
      </li>
    </ol>
  </section>
</template>
<style scoped>
.community-pins {
  margin: 8px 0 18px;
  padding: 12px 14px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
}
h2 {
  font-size: 16px;
  margin: 0 0 6px;
}
ol {
  list-style: none;
  padding: 0;
  margin: 0;
}
li + li {
  border-top: 1px dashed var(--ft-color-border);
}
button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.community-pins__stamp {
  flex: none;
  padding: 2px 5px;
  border: 1px solid var(--ft-color-primary);
  color: var(--ft-color-primary);
  font-size: 0.75rem;
}
.community-pins__copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
strong {
  font-size: 1rem;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
small {
  color: var(--ft-color-text-muted);
  font-size: 0.8rem;
}
</style>
