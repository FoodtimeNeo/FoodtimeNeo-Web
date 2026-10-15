<script setup>
defineProps({
  tone: {
    type: String,
    default: 'red',
    validator: (value) => ['red', 'blue'].includes(value),
  },
  shape: {
    type: String,
    default: 'label',
    validator: (value) => ['label', 'rating', 'date'].includes(value),
  },
});
</script>

<template>
  <span
    class="stamp-badge"
    :class="[`stamp-badge--${tone}`, `stamp-badge--${shape}`]"
    ><slot
  /></span>
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

.stamp-badge--rating,
.stamp-badge--date {
  padding: 0;
  border-radius: 50%;
  mix-blend-mode: multiply;
}

.stamp-badge--rating {
  width: 54px;
  height: 54px;
  border-style: double;
  border-width: 3px;
  font-family: var(--zine-title-font);
  font-size: 21px;
}

.stamp-badge--date {
  width: 72px;
  height: 72px;
  border-style: dashed;
  font-family: var(--zine-handwriting-font);
  font-size: 17px;
  text-align: center;
}

@media (max-width: 768px) {
  .stamp-badge {
    transform: none;
  }
}
</style>
