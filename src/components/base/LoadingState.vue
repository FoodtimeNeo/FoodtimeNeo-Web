<script setup>
defineProps({
  message: { type: String, default: '正在加载…' },
});
</script>

<template>
  <div class="content-state torn-edge" role="status" aria-live="polite">
    <span class="content-state__mark" aria-hidden="true">✦</span>
    <p class="handwrite">{{ message }}</p>
  </div>
</template>

<style src="./content-state.css"></style>
