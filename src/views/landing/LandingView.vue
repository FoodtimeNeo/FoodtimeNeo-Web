<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import appScreenImg from '@/assets/images/app-preview-screen.png';
import {
  APK_DOWNLOAD_URL,
  APK_FILE_NAME,
  APK_SIZE,
  APK_VERSION,
  APK_TARGET_OS,
} from '@/constants/download.js';

const router = useRouter();
const auth = useAuthStore();

// 鼠标 3D 视差倾斜计算
const mouseX = ref(0);
const mouseY = ref(0);
const isHovering = ref(false);

function handleMouseMove(event) {
  if (typeof window === 'undefined') return;
  const { innerWidth, innerHeight } = window;
  // 归一化为 -1 ~ 1
  mouseX.value = (event.clientX / innerWidth - 0.5) * 2;
  mouseY.value = (event.clientY / innerHeight - 0.5) * 2;
  isHovering.value = true;
}

function handleMouseLeave() {
  mouseX.value = 0;
  mouseY.value = 0;
  isHovering.value = false;
}

const deviceTransformStyle = computed(() => {
  if (!isHovering.value) {
    return {
      transform:
        'perspective(1200px) rotateX(4deg) rotateY(-8deg) rotateZ(1deg)',
      transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  }
  // 倾斜范围限制在 -14deg ~ 14deg
  const rotX = -mouseY.value * 12 + 4;
  const rotY = mouseX.value * 14 - 8;
  return {
    transform: `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(0.5deg)`,
    transition: 'transform 0.15s ease-out',
  };
});

const glareStyle = computed(() => {
  if (!isHovering.value) {
    return { opacity: 0.35, transform: 'translate(0%, 0%) rotate(45deg)' };
  }
  const moveX = (mouseX.value * 30).toFixed(1);
  const moveY = (mouseY.value * 30).toFixed(1);
  return {
    opacity: 0.55,
    transform: `translate(${moveX}%, ${moveY}%) rotate(45deg)`,
    transition: 'transform 0.15s ease-out, opacity 0.2s ease',
  };
});

// 下载反馈 Toast
const showDownloadToast = ref(false);
let toastTimer = null;

function handleDownloadTrigger() {
  showDownloadToast.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    showDownloadToast.value = false;
  }, 4000);
}

// 快速跳转网页版
function goToWeb() {
  if (auth.isAuthenticated) {
    router.push({ name: 'home' });
  } else {
    router.push({ name: 'login' });
  }
}

// 监听窗口尺寸以保持最佳视口
const isMobile = ref(false);
function checkViewport() {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth <= 840;
  }
}

onMounted(() => {
  checkViewport();
  window.addEventListener('resize', checkViewport, { passive: true });
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkViewport);
  }
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<template>
  <div
    class="landing-viewport"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 背景流光与环境光晕 -->
    <div class="ambient-glow ambient-glow--primary" aria-hidden="true"></div>
    <div class="ambient-glow ambient-glow--secondary" aria-hidden="true"></div>
    <div class="ambient-grid-overlay" aria-hidden="true"></div>

    <!-- 顶部极简毛玻璃导航 -->
    <header class="landing-header">
      <div class="landing-header__inner">
        <div class="brand-group">
          <span class="brand-emblem" aria-hidden="true">BJTU</span>
          <div class="brand-text-block">
            <h1 class="brand-title">北交干饭吧</h1>
            <span class="brand-caption">安卓官方客户端</span>
          </div>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="header-link-btn"
            data-testid="enter-web-btn"
            @click="goToWeb"
          >
            {{ auth.isAuthenticated ? '进入网页版首页' : '网页版登录' }} →
          </button>
          <a
            :href="APK_DOWNLOAD_URL"
            :download="APK_FILE_NAME"
            class="header-cta-btn"
            data-testid="nav-download-btn"
            @click="handleDownloadTrigger"
          >
            下载 APK
          </a>
        </div>
      </div>
    </header>

    <!-- 主舞台：单屏沉浸式 Hero -->
    <main class="hero-stage">
      <div class="hero-stage__container">
        <!-- 左侧核心文案与操作区域 -->
        <div class="hero-left">
          <div class="badge-pill">
            <span class="pulse-indicator" aria-hidden="true"></span>
            <span>最新版本 {{ APK_VERSION }} · 原生纯净构建</span>
          </div>

          <h2 class="hero-headline">
            北交干饭吧<br />
            <span class="headline-gradient">掌上美食指南</span>
          </h2>

          <p class="hero-subtext">
            汇聚交大各大食堂档口真实口碑、出餐避峰与同学食记。一键装入手机，让每一次干饭都满怀期待。
          </p>

          <!-- 核心下载操作卡片 -->
          <div class="download-action-area">
            <div class="download-main-row">
              <a
                :href="APK_DOWNLOAD_URL"
                :download="APK_FILE_NAME"
                class="cta-download-btn"
                data-testid="hero-download-btn"
                @click="handleDownloadTrigger"
              >
                <div class="btn-glow-aura" aria-hidden="true"></div>
                <div class="btn-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div class="btn-labels">
                  <span class="btn-title">下载安卓安装包</span>
                  <span class="btn-meta"
                    >{{ APK_FILE_NAME }} · {{ APK_SIZE }}</span
                  >
                </div>
              </a>

              <!-- 手机扫码直装悬停微卡 -->
              <div class="qr-chip-card" data-testid="qr-float-card">
                <div class="qr-thumb">
                  <svg
                    class="qr-svg-view"
                    viewBox="0 0 100 100"
                    aria-label="扫码下载二维码"
                  >
                    <rect width="100" height="100" fill="#fff" rx="4" />
                    <!-- 定位角标 -->
                    <rect x="8" y="8" width="24" height="24" fill="#140f0d" />
                    <rect x="12" y="12" width="16" height="16" fill="#fff" />
                    <rect x="16" y="16" width="8" height="8" fill="#c9341e" />
                    <rect x="68" y="8" width="24" height="24" fill="#140f0d" />
                    <rect x="72" y="12" width="16" height="16" fill="#fff" />
                    <rect x="76" y="16" width="8" height="8" fill="#c9341e" />
                    <rect x="8" y="68" width="24" height="24" fill="#140f0d" />
                    <rect x="12" y="72" width="16" height="16" fill="#fff" />
                    <rect x="16" y="76" width="8" height="8" fill="#c9341e" />
                    <!-- 仿真数据码块 -->
                    <rect x="40" y="10" width="8" height="8" fill="#140f0d" />
                    <rect x="52" y="14" width="6" height="6" fill="#140f0d" />
                    <rect x="36" y="24" width="12" height="6" fill="#140f0d" />
                    <rect x="12" y="40" width="6" height="12" fill="#140f0d" />
                    <rect x="24" y="44" width="8" height="8" fill="#140f0d" />
                    <rect x="40" y="40" width="20" height="20" fill="#c9341e" />
                    <text
                      x="50"
                      y="54"
                      font-size="9"
                      fill="#fff"
                      text-anchor="middle"
                      font-weight="bold"
                    >
                      BJTU
                    </text>
                    <rect x="68" y="40" width="10" height="6" fill="#140f0d" />
                    <rect x="82" y="48" width="8" height="8" fill="#140f0d" />
                    <rect x="36" y="68" width="8" height="12" fill="#140f0d" />
                    <rect x="50" y="76" width="14" height="6" fill="#140f0d" />
                    <rect x="72" y="72" width="8" height="10" fill="#140f0d" />
                    <rect x="84" y="68" width="8" height="16" fill="#140f0d" />
                  </svg>
                </div>
                <div class="qr-text">
                  <span class="qr-label">手机扫码下载</span>
                  <span class="qr-sub">相机或浏览器扫描</span>
                </div>
              </div>
            </div>

            <!-- 系统参数与保障 -->
            <div class="spec-row">
              <span class="spec-item">兼容 {{ APK_TARGET_OS }} 及鸿蒙</span>
              <span class="spec-divider">/</span>
              <span class="spec-item">包体 {{ APK_SIZE }}</span>
              <span class="spec-divider">/</span>
              <span class="spec-item">官方原生无广告</span>
            </div>
          </div>
        </div>

        <!-- 右侧：搭载大模型真实界面的精密 3D 拟物机身 -->
        <div class="hero-right">
          <div class="device-viewport">
            <div class="device-stand" :style="deviceTransformStyle">
              <!-- 精密手机机身 -->
              <div class="phone-chassis">
                <!-- 机身边框反光与侧键 -->
                <div class="phone-rim phone-rim--left"></div>
                <div class="phone-rim phone-rim--right"></div>
                <div class="phone-island">
                  <span class="island-camera"></span>
                </div>

                <!-- 屏幕内嵌大模型生成的超高清真实 UI 截图 -->
                <div class="phone-display">
                  <img
                    :src="appScreenImg"
                    alt="北交干饭吧客户端界面"
                    class="screen-render-img"
                  />
                  <!-- 物理镜面反射光掠 -->
                  <div
                    class="screen-glare"
                    :style="glareStyle"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>

              <!-- 机身底部立体柔和阴影 -->
              <div class="phone-shadow" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 极简单屏底部栏 -->
    <footer class="landing-footer">
      <div class="landing-footer__inner">
        <span class="footer-copy"> © 2026 北交干饭吧 · 学生自研美食平台 </span>
        <div class="footer-links">
          <a
            :href="APK_DOWNLOAD_URL"
            :download="APK_FILE_NAME"
            class="footer-link"
            data-testid="bottom-download-btn"
            @click="handleDownloadTrigger"
          >
            直接下载 APK
          </a>
          <button type="button" class="footer-btn" @click="goToWeb">
            进入网页版
          </button>
        </div>
      </div>
    </footer>

    <!-- 下载触发 Toast 提示 -->
    <transition name="toast-fade">
      <div
        v-if="showDownloadToast"
        class="download-toast"
        role="status"
        aria-live="polite"
        data-testid="download-toast"
      >
        <div class="toast-indicator"></div>
        <div class="toast-content">
          <div class="toast-headline">已启动安装包下载</div>
          <div class="toast-subline">
            {{ APK_FILE_NAME }} ({{ APK_SIZE }})
            正在下载，请在通知栏或下载管理器查看。
          </div>
        </div>
        <button
          type="button"
          class="toast-dismiss"
          aria-label="关闭提示"
          @click="showDownloadToast = false"
        >
          ✕
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
// 高端暗调与深朱砂红主题设计令牌
$color-bg: #0d0a08;
$color-surface: #17120f;
$color-primary: #c9341e;
$color-primary-light: #e63e26;
$color-secondary: #214358;
$color-text: #f5ede6;
$color-text-dim: #9e8f85;
$color-border: rgb(255 255 255 / 12%);

.landing-viewport {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  background-color: $color-bg;
  color: $color-text;
  font-family: var(
    --ft-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif
  );
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  @media (min-height: 700px) and (min-width: 960px) {
    height: 100vh;
    overflow: hidden;
  }
}

// ---------------- 环境流光背景 ----------------
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  z-index: 0;

  &--primary {
    width: 600px;
    height: 600px;
    top: -120px;
    right: 8%;
    background: radial-gradient(
      circle,
      rgb(201 52 30 / 22%) 0%,
      transparent 70%
    );
  }

  &--secondary {
    width: 500px;
    height: 500px;
    bottom: -100px;
    left: 4%;
    background: radial-gradient(
      circle,
      rgb(33 67 88 / 26%) 0%,
      transparent 70%
    );
  }
}

.ambient-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 2.5%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 2.5%) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
  mask-image: radial-gradient(ellipse at 50% 50%, #000 30%, transparent 80%);
}

// ---------------- 顶部极简毛玻璃导航 ----------------
.landing-header {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid $color-border;
  background: rgb(13 10 8 / 65%);
  backdrop-filter: blur(20px);
  padding: 14px 0;

  &__inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand-group {
    display: flex;
    align-items: center;
    gap: 12px;

    .brand-emblem {
      background: $color-primary;
      color: #fff;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 1px;
      padding: 3px 8px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgb(201 52 30 / 40%);
    }

    .brand-title {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.2px;
      color: #fff;
      line-height: 1.2;
    }

    .brand-caption {
      font-size: 11px;
      color: $color-text-dim;
      letter-spacing: 0.5px;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-link-btn {
      background: transparent;
      border: none;
      color: $color-text-dim;
      font-size: 14px;
      cursor: pointer;
      padding: 6px 10px;
      transition: color 0.2s ease;

      &:hover {
        color: #fff;
      }
    }

    .header-cta-btn {
      display: inline-flex;
      align-items: center;
      padding: 7px 18px;
      background: rgb(255 255 255 / 10%);
      color: #fff;
      border: 1px solid rgb(255 255 255 / 18%);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;

      &:hover {
        background: #fff;
        color: #000;
        border-color: #fff;
      }
    }
  }
}

// ---------------- 主舞台 Hero Stage ----------------
.hero-stage {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 40px 0;

  &__container {
    max-width: 1240px;
    width: 100%;
    margin: 0 auto;
    padding: 0 28px;
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    align-items: center;
    gap: 56px;

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 40px;
      padding: 24px;
    }
  }
}

// ---------------- 左侧文案与下载操作 ----------------
.hero-left {
  .badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgb(255 255 255 / 7%);
    border: 1px solid rgb(255 255 255 / 14%);
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: #e5ded7;
    margin-bottom: 24px;

    .pulse-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: $color-primary-light;
      box-shadow: 0 0 10px $color-primary;
    }
  }

  .hero-headline {
    margin: 0 0 20px;
    font-size: clamp(38px, 5.2vw, 58px);
    font-weight: 900;
    line-height: 1.12;
    letter-spacing: -1px;
    color: #fff;

    .headline-gradient {
      background: linear-gradient(135deg, #fff 30%, #f0a295 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  .hero-subtext {
    margin: 0 0 36px;
    font-size: clamp(16px, 1.8vw, 18px);
    line-height: 1.65;
    color: $color-text-dim;
    max-width: 540px;

    @media (max-width: 960px) {
      margin-left: auto;
      margin-right: auto;
    }
  }
}

.download-action-area {
  .download-main-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;

    @media (max-width: 960px) {
      justify-content: center;
    }

    @media (max-width: 520px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  // 极具现代触感的主下载大按钮
  .cta-download-btn {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 16px;
    padding: 16px 32px;
    background: linear-gradient(135deg, $color-primary 0%, #a82411 100%);
    border: 1px solid rgb(255 255 255 / 22%);
    border-radius: 16px;
    color: #fff;
    text-decoration: none;
    box-shadow:
      0 12px 32px rgb(201 52 30 / 42%),
      inset 0 1px 1px rgb(255 255 255 / 35%);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

    &:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow:
        0 18px 40px rgb(201 52 30 / 55%),
        inset 0 1px 2px rgb(255 255 255 / 50%);
      background: linear-gradient(
        135deg,
        $color-primary-light 0%,
        #b82b16 100%
      );
    }

    &:active {
      transform: translateY(1px) scale(0.99);
    }

    .btn-icon {
      width: 42px;
      height: 42px;
      background: rgb(255 255 255 / 15%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 22px;
        height: 22px;
        stroke: #fff;
      }
    }

    .btn-labels {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;

      .btn-title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.5px;
        line-height: 1.25;
      }

      .btn-meta {
        font-size: 12px;
        color: rgb(255 255 255 / 80%);
      }
    }
  }

  // 扫码微卡
  .qr-chip-card {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: rgb(255 255 255 / 5%);
    border: 1px solid rgb(255 255 255 / 10%);
    padding: 10px 16px;
    border-radius: 14px;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;

    &:hover {
      background: rgb(255 255 255 / 8%);
      border-color: rgb(255 255 255 / 20%);
      transform: translateY(-1px);
    }

    .qr-thumb {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;

      .qr-svg-view {
        width: 100%;
        height: 100%;
        display: block;
      }
    }

    .qr-text {
      display: flex;
      flex-direction: column;
      text-align: left;

      .qr-label {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
      }

      .qr-sub {
        font-size: 11px;
        color: $color-text-dim;
      }
    }
  }

  .spec-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: $color-text-dim;

    @media (max-width: 960px) {
      justify-content: center;
    }

    .spec-divider {
      color: rgb(255 255 255 / 15%);
    }
  }
}

// ---------------- 右侧：高精度 3D 拟物机身 ----------------
.hero-right {
  display: flex;
  justify-content: center;
  align-items: center;

  .device-viewport {
    position: relative;
    width: 310px;
    max-width: 82vw;
  }

  .device-stand {
    position: relative;
    transform-style: preserve-3d;
    will-change: transform;
  }

  .phone-chassis {
    position: relative;
    z-index: 2;
    background: #121010;
    border: 10px solid #231f1c;
    border-radius: 46px;
    box-shadow:
      0 28px 60px rgb(0 0 0 / 65%),
      0 0 0 1px rgb(255 255 255 / 10%),
      inset 0 0 6px rgb(255 255 255 / 12%);
    overflow: hidden;
  }

  .phone-island {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 72px;
    height: 18px;
    background: #000;
    border-radius: 20px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 14px;

    .island-camera {
      width: 7px;
      height: 7px;
      background: #17212d;
      border: 1px solid #28374a;
      border-radius: 50%;
    }
  }

  .phone-display {
    position: relative;
    width: 100%;
    background: #000;
    overflow: hidden;
    line-height: 0;

    .screen-render-img {
      width: 100%;
      height: auto;
      display: block;
      user-select: none;
      -webkit-user-drag: none;
    }

    .screen-glare {
      position: absolute;
      top: -60%;
      left: -60%;
      width: 220%;
      height: 220%;
      background: linear-gradient(
        135deg,
        transparent 35%,
        rgb(255 255 255 / 20%) 50%,
        transparent 65%
      );
      pointer-events: none;
      z-index: 6;
    }
  }

  .phone-shadow {
    position: absolute;
    bottom: -32px;
    left: 10%;
    width: 80%;
    height: 28px;
    background: radial-gradient(
      ellipse at center,
      rgb(0 0 0 / 75%) 0%,
      transparent 75%
    );
    filter: blur(10px);
    z-index: 1;
    pointer-events: none;
  }
}

// ---------------- 极简单屏底部栏 ----------------
.landing-footer {
  position: relative;
  z-index: 10;
  border-top: 1px solid rgb(255 255 255 / 8%);
  padding: 16px 0;
  background: rgb(13 10 8 / 80%);

  &__inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: $color-text-dim;
    flex-wrap: wrap;
    gap: 12px;

    @media (max-width: 600px) {
      justify-content: center;
      text-align: center;
    }
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 18px;

    .footer-link,
    .footer-btn {
      color: $color-text-dim;
      text-decoration: none;
      background: transparent;
      border: none;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
      transition: color 0.2s ease;

      &:hover {
        color: #fff;
      }
    }
  }
}

// ---------------- 下载 Toast ----------------
.download-toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 999;
  background: #1f1a17;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 14px;
  padding: 14px 18px;
  box-shadow: 0 16px 36px rgb(0 0 0 / 60%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 380px;

  .toast-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #34c759;
    box-shadow: 0 0 8px #34c759;
    flex-shrink: 0;
  }

  .toast-content {
    flex: 1;

    .toast-headline {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 2px;
    }

    .toast-subline {
      font-size: 12px;
      color: $color-text-dim;
      line-height: 1.4;
    }
  }

  .toast-dismiss {
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 13px;
    padding: 4px;

    &:hover {
      color: #fff;
    }
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

// ---------------- 动效无障碍模式 ----------------
@media (prefers-reduced-motion: reduce) {
  .device-stand {
    transform: none !important;
    transition: none !important;
  }

  .ambient-glow {
    display: none !important;
  }
}
</style>
