<script setup>
import { ref } from 'vue';
import {
  dismissIosInstallBanner,
  shouldShowIosInstallBanner,
} from '@/utils/iosPwa.js';
import IosInstallSteps from './IosInstallSteps.vue';

const visible = ref(shouldShowIosInstallBanner());
const expanded = ref(false);

function dismiss() {
  dismissIosInstallBanner();
  visible.value = false;
}
</script>

<template>
  <aside
    v-if="visible"
    class="ios-install-banner"
    aria-label="苹果主屏幕应用安装引导"
    data-testid="ios-install-banner"
  >
    <div class="ios-install-banner__bar">
      <svg
        viewBox="0 0 108 108"
        class="ios-install-banner__icon"
        aria-hidden="true"
      >
        <rect width="108" height="108" rx="22" fill="#fffaf0" />
        <rect x="16" y="16" width="76" height="76" rx="10" fill="#c9341e" />
        <path
          fill="#fffaf0"
          d="M31,45h46v5c0,16 -9,26 -23,26s-23,-10 -23,-26zM36,29h4v11h-4zM52,25h4v15h-4zM68,29h4v11h-4zM29,79h50v4h-50z"
        />
      </svg>
      <div class="ios-install-banner__copy">
        <strong>保存到主屏幕，全屏使用</strong>
        <span>iPhone / iPad 添加桌面图标，像原生 App 一样顺手</span>
      </div>
      <div class="ios-install-banner__actions">
        <button
          type="button"
          class="ios-install-banner__guide-btn"
          :aria-expanded="expanded"
          data-testid="ios-banner-toggle"
          @click="expanded = !expanded"
        >
          {{ expanded ? '收起' : '怎么添加' }}
        </button>
        <button
          type="button"
          class="ios-install-banner__close"
          aria-label="暂不提示添加到主屏幕"
          data-testid="ios-banner-close"
          @click="dismiss"
        >
          ×
        </button>
      </div>
    </div>
    <div v-if="expanded" class="ios-install-banner__steps">
      <IosInstallSteps compact />
    </div>
  </aside>
</template>

<style scoped lang="scss">
.ios-install-banner {
  position: fixed;
  z-index: 29;
  right: max(12px, var(--app-mobile-safe-right));
  bottom: calc(
    var(--app-mobile-tabbar-height) + var(--app-mobile-safe-bottom) + 8px
  );
  left: max(12px, var(--app-mobile-safe-left));
  max-width: 520px;
  margin: 0 auto;
  padding: 10px 12px;
  border: 1px solid var(--ft-border-control);
  border-radius: var(--ft-radius-card);
  background: rgb(var(--ft-overlay-paper-rgb) / 96%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 10px 26px rgb(30 18 10 / 16%);
  color: var(--ft-color-text);
  user-select: none;
  -webkit-touch-callout: none;
}

.ios-install-banner__bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ios-install-banner__icon {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 9px;
  border: 1px solid var(--ft-border-subtle);
}

.ios-install-banner__copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 13.5px;
    line-height: 1.25;
  }

  span {
    color: var(--ft-color-text-muted);
    font-size: 12px;
    line-height: 1.3;
  }
}

.ios-install-banner__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.ios-install-banner__guide-btn {
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--ft-radius-pill);
  background: var(--ft-color-primary);
  color: #fff8f5;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:active {
    transform: scale(0.96);
  }
}

.ios-install-banner__close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ft-color-text-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;

  &:active {
    background: var(--ft-color-surface-ink);
  }
}

.ios-install-banner__steps {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--ft-color-border);
}

@media (min-width: 769px) {
  .ios-install-banner {
    bottom: 20px;
  }
}
</style>
