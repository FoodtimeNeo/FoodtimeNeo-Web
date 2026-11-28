<script setup>
import { ref } from 'vue';
import { isInAppBrowser, isIosSafariBrowser } from '@/utils/iosPwa.js';

const props = defineProps({
  compact: { type: Boolean, default: false },
  inApp: { type: Boolean, default: undefined },
  safari: { type: Boolean, default: undefined },
});

const detectedInApp =
  props.inApp !== undefined ? props.inApp : isInAppBrowser();
const detectedSafari =
  props.safari !== undefined ? props.safari : isIosSafariBrowser();

const copyFeedback = ref('');

async function copyCurrentUrl() {
  if (typeof window === 'undefined') return;
  const url = `${window.location.origin}/`;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      copyFeedback.value = '网址已复制，请粘贴到 Safari 打开';
      return;
    }
  } catch {
    /* Fallback to prompt message below. */
  }
  copyFeedback.value = `请手动复制网址到 Safari 打开：${url}`;
}
</script>

<template>
  <div class="ios-steps" :class="{ 'ios-steps--compact': compact }">
    <p v-if="detectedInApp" class="ios-steps__notice" role="note">
      当前似乎在应用内置浏览器中打开，请先点击右上角「⋯」选择「在默认浏览器（Safari）中打开」，再按以下步骤添加。
    </p>
    <p v-else-if="!detectedSafari" class="ios-steps__notice" role="note">
      苹果设备请使用系统自带
      <strong>Safari 浏览器</strong> 打开本站，再执行以下操作。
    </p>

    <ol class="ios-steps__list">
      <li>
        <span class="ios-steps__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v12m0-12-4 4m4-4 4 4" />
            <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
          </svg>
        </span>
        <div>
          <strong>点击 Safari 底部「分享」按钮</strong>
          <p>在 Safari 底部工具栏中间找到方框带向上箭头的分享图标。</p>
        </div>
      </li>
      <li>
        <span class="ios-steps__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </span>
        <div>
          <strong>选择「添加到主屏幕」</strong>
          <p>向上滑动分享菜单，点选「添加到主屏幕」，再点右上角「添加」。</p>
        </div>
      </li>
      <li>
        <span class="ios-steps__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
            <path d="M10.5 18.5h3" />
          </svg>
        </span>
        <div>
          <strong>从桌面图标全屏启动</strong>
          <p>
            返回主屏幕点击「北交干饭吧」图标打开，即享无地址栏全屏 App
            体验，免手动更新，打开自动同步最新版（首次从桌面打开需重新登录一次）。
          </p>
        </div>
      </li>
    </ol>

    <div v-if="detectedInApp || !detectedSafari" class="ios-steps__copy">
      <button
        type="button"
        class="ios-steps__copy-btn"
        data-testid="ios-copy-url-btn"
        @click="copyCurrentUrl"
      >
        复制本站网址到 Safari
      </button>
      <p v-if="copyFeedback" class="ios-steps__feedback" role="status">
        {{ copyFeedback }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ios-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--ft-color-text);
  font-size: 14px;
  line-height: 1.55;
}

.ios-steps__notice {
  margin: 0;
  padding: 9px 12px;
  border: 1px dashed var(--ft-color-primary);
  border-radius: var(--ft-radius-sm);
  background: var(--zine-stamp-red-soft);
  color: var(--ft-color-text);
  font-size: 13px;
}

.ios-steps__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
  }

  strong {
    display: block;
    font-size: 14px;
    color: var(--ft-color-text);
  }

  p {
    margin: 2px 0 0;
    color: var(--ft-color-text-muted);
    font-size: 13px;
  }
}

.ios-steps__badge {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--ft-border-control);
  border-radius: 10px;
  background: var(--ft-color-bg-soft);
  color: var(--ft-color-primary);

  svg {
    width: 19px;
    height: 19px;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.ios-steps--compact {
  font-size: 13px;

  .ios-steps__list {
    gap: 8px;
  }
}

.ios-steps__copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ios-steps__copy-btn {
  align-self: flex-start;
  min-height: 40px;
  padding: 6px 14px;
  border: 1px solid var(--ft-border-control);
  border-radius: var(--ft-radius-pill);
  background: var(--ft-color-surface);
  color: var(--ft-color-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.ios-steps__feedback {
  margin: 0;
  color: var(--ft-color-accent);
  font-size: 12.5px;
}
</style>
