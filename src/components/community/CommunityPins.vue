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
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-card);
  background: var(--zine-paper-card-alt);
  box-shadow: var(--ft-shadow-card);
}
h2 {
  font-size: 14px;
  color: var(--ft-color-text-muted);
  margin: 0 0 6px;
}
ol {
  list-style: none;
  padding: 0;
  margin: 0;
}
li + li {
  border-top: 1px solid var(--ft-border-subtle);
}
button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 8px 4px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background var(--ft-transition-fast);
}
button:hover {
  background: var(--ft-color-bg-soft);
}
.community-pins__stamp {
  flex: none;
  padding: 2px 8px;
  border-radius: var(--ft-radius-pill);
  background: var(--zine-stamp-red-soft);
  color: var(--ft-color-primary);
  font-size: 11px;
  font-weight: 700;
}
.community-pins__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}
strong {
  font-size: 15px;
  overflow-wrap: anywhere;
  line-height: 1.4;
}
small {
  color: var(--ft-color-text-muted);
  font-size: 12px;
}
</style>
