<script setup>
import { versionUpdateState } from '@/utils/versionRefresh.js';
</script>

<template>
  <aside
    v-if="versionUpdateState.phase !== 'idle'"
    class="version-update"
    role="status"
  >
    {{
      versionUpdateState.phase === 'waiting'
        ? '新版已准备好，当前编辑或操作结束后将自动更新。'
        : versionUpdateState.phase === 'updating'
          ? '正在更新页面，登录和已保存草稿将保留。'
          : '新版资源尚未就绪，将稍后自动重试。'
    }}
  </aside>
</template>

<style scoped>
.version-update {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  z-index: 1500;
  padding: 10px 14px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  font-size: 14px;
  pointer-events: none;
}
</style>
