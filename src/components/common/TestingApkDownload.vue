<script setup>
import {
  TEST_APK_DOWNLOAD_URL,
  TEST_APK_FILE_NAME,
  TEST_APK_SIZE,
  TEST_APK_VERSION,
  TEST_RELEASE_URL,
} from '@/constants/testingDownload.js';
</script>

<template>
  <aside class="testing-download" aria-label="安卓测试版下载">
    <p class="testing-download__title">
      抢先体验 · {{ TEST_APK_VERSION }} 测试版
    </p>
    <p class="testing-download__hint">
      可自行选择，可能存在未发现的问题。安装后将升级当前应用，请先保存本机草稿。
    </p>
    <div class="testing-download__actions">
      <a :href="TEST_APK_DOWNLOAD_URL" :download="TEST_APK_FILE_NAME">
        下载测试版 · {{ TEST_APK_SIZE }}
      </a>
      <a :href="TEST_RELEASE_URL" target="_blank" rel="noopener noreferrer">
        更新说明 ↗
      </a>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.testing-download {
  margin-top: 20px;
  padding: 14px 16px;
  border: 1px dashed var(--ft-color-secondary, #765d4b);
  border-radius: 8px;
  background: var(--zine-paper-card, #fffaf0);
  color: var(--ft-color-text, #39261c);
  text-align: left;
  overflow-wrap: anywhere;
}
.testing-download__title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
}
.testing-download__hint {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}
.testing-download__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 8px;
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--ft-color-primary, #b82e22);
    font-size: 15px;
    text-underline-offset: 4px;
    &:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 3px;
    }
  }
}
</style>
