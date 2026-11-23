<script setup>
import { useAppearance } from '@/composables/useAppearance.js';
const { appearance, setAppearance } = useAppearance();
</script>
<template>
  <label class="appearance-picker">
    <span>外观</span>
    <select
      :value="appearance"
      aria-label="外观"
      @change="setAppearance($event.target.value)"
    >
      <option value="system">跟随系统</option>
      <option value="light">浅色</option>
      <option value="dark">深色</option>
    </select>
  </label>
</template>
<style scoped>
.appearance-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
}
.appearance-picker select {
  min-height: 44px;
  color: var(--ft-color-text);
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-border);
  border-radius: 12px;
  padding: 0 12px;
  font: inherit;
}
</style>
