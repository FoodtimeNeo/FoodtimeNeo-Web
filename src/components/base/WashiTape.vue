<script setup>
defineProps({
  color: {
    type: String,
    default: 'red',
    validator: (value) => ['red', 'blue'].includes(value),
  },
});
</script>

<template>
  <span class="washi-tape" :class="`washi-tape--${color}`" aria-hidden="true" />
</template>

<style scoped>
.washi-tape {
  display: inline-block;
  width: 104px;
  height: 30px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  pointer-events: none;
}

.washi-tape--red {
  background-image: var(--zine-decor-tape-red);
}

.washi-tape--blue {
  background-image: var(--zine-decor-tape-blue);
}
</style>
