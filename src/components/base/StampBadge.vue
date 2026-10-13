<script setup>
defineProps({
  tone: {
    type: String,
    default: 'red',
    validator: (value) => ['red', 'blue'].includes(value),
  },
});
</script>

<template>
  <span class="stamp-badge" :class="`stamp-badge--${tone}`"><slot /></span>
</template>

<style scoped>
.stamp-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 3px 10px;
  border: 2px solid currentColor;
  font-size: var(--ft-font-size-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  transform: rotate(var(--zine-rotate-stamp));
}

.stamp-badge--red {
  background: var(--zine-stamp-red-soft);
  color: var(--zine-stamp-red);
}

.stamp-badge--blue {
  background: var(--zine-stamp-blue-soft);
  color: var(--zine-stamp-blue);
}

@media (max-width: 768px) {
  .stamp-badge {
    transform: none;
  }
}
</style>
