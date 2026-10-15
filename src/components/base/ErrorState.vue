<script setup>
import InkButton from './InkButton.vue';

defineProps({
  title: { type: String, default: '暂时无法加载' },
  description: { type: String, default: '请稍后再试。' },
});

const emit = defineEmits(['retry']);
</script>

<template>
  <div class="content-state torn-edge" role="alert">
    <span class="content-state__mark" aria-hidden="true">!</span>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <InkButton @click="emit('retry')">重试</InkButton>
  </div>
</template>

<style src="./content-state.css"></style>
