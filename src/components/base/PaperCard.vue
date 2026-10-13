<script setup>
defineProps({
  variant: {
    type: String,
    default: 'plain',
    validator: (value) => ['plain', 'warm'].includes(value),
  },
});
</script>

<template>
  <div class="paper-card" :class="`paper-card--${variant}`">
    <slot />
  </div>
</template>

<style scoped>
.paper-card {
  position: relative;
  padding: var(--ft-space-3);
  border: 1px solid var(--zine-paper-edge);
  border-radius: var(--zine-radius-paper);
  box-shadow: var(--ft-shadow-sm);
}

.paper-card--plain {
  background: var(--zine-paper-card);
}

.paper-card--warm {
  background: var(--zine-paper-card-alt);
}

@media (max-width: 768px) {
  .paper-card {
    padding: var(--app-mobile-card-padding);
    box-shadow: var(--app-mobile-shadow);
  }
}
</style>
