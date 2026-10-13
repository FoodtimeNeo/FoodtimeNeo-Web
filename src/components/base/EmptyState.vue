<script setup>
defineProps({
  title: { type: String, default: '这里还没有内容' },
  description: { type: String, default: '' },
});
</script>

<template>
  <div class="content-state">
    <span class="content-state__mark" aria-hidden="true">✦</span>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<style src="./content-state.css"></style>
