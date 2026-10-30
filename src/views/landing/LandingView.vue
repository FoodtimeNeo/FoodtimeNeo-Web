<script setup>
import { ref, computed, onUnmounted } from 'vue';
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
        'perspective(1200px) rotateX(3deg) rotateY(-7deg) rotateZ(0.5deg)',
      transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  }
  const rotX = -mouseY.value * 10 + 3;
  const rotY = mouseX.value * 12 - 7;
  return {
    transform: `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(0.5deg)`,
    transition: 'transform 0.15s ease-out',
  };
});

const glareStyle = computed(() => {
  if (!isHovering.value) {
    return { opacity: 0.25, transform: 'translate(0%, 0%) rotate(45deg)' };
  }
  const moveX = (mouseX.value * 25).toFixed(1);
  const moveY = (mouseY.value * 25).toFixed(1);
  return {
    opacity: 0.45,
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

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
});

// 快速跳转网页版
function goToWeb() {
  if (auth.isAuthenticated) {
    router.push({ name: 'home' });
  } else {
    router.push({ name: 'login' });
  }
}
</script>

<template>
  <div
    class="landing-viewport"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 温润米白底纸与柔和氛围光晕 -->
    <div class="ambient-glow ambient-glow--warm" aria-hidden="true"></div>
    <div class="ambient-glow ambient-glow--red" aria-hidden="true"></div>

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

          <!-- 核心下载操作区 -->
          <div class="download-action-area">
            <div class="download-main-row">
              <a
                :href="APK_DOWNLOAD_URL"
                :download="APK_FILE_NAME"
                class="cta-download-btn"
                data-testid="hero-download-btn"
                @click="handleDownloadTrigger"
              >
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
                <span class="btn-shimmer" aria-hidden="true"></span>
              </a>

              <!-- 手机扫码直装微卡 -->
              <div class="qr-chip-card" data-testid="qr-float-card">
                <div class="qr-thumb">
                  <svg
                    class="qr-svg-view"
                    viewBox="0 0 100 100"
                    aria-label="扫码下载二维码"
                  >
                    <rect width="100" height="100" fill="#fff" rx="4" />
                    <!-- 定位角标 -->
                    <rect x="8" y="8" width="24" height="24" fill="#3a2418" />
                    <rect x="12" y="12" width="16" height="16" fill="#fff" />
                    <rect x="16" y="16" width="8" height="8" fill="#c9341e" />
                    <rect x="68" y="8" width="24" height="24" fill="#3a2418" />
                    <rect x="72" y="12" width="16" height="16" fill="#fff" />
                    <rect x="76" y="16" width="8" height="8" fill="#c9341e" />
                    <rect x="8" y="68" width="24" height="24" fill="#3a2418" />
                    <rect x="12" y="72" width="16" height="16" fill="#fff" />
                    <rect x="16" y="76" width="8" height="8" fill="#c9341e" />
                    <!-- 仿真数据码块 -->
                    <rect x="40" y="10" width="8" height="8" fill="#3a2418" />
                    <rect x="52" y="14" width="6" height="6" fill="#3a2418" />
                    <rect x="36" y="24" width="12" height="6" fill="#3a2418" />
                    <rect x="12" y="40" width="6" height="12" fill="#3a2418" />
                    <rect x="24" y="44" width="8" height="8" fill="#3a2418" />
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
                    <rect x="68" y="40" width="10" height="6" fill="#3a2418" />
                    <rect x="82" y="48" width="8" height="8" fill="#3a2418" />
                    <rect x="36" y="68" width="8" height="12" fill="#3a2418" />
                    <rect x="50" y="76" width="14" height="6" fill="#3a2418" />
                    <rect x="72" y="72" width="8" height="10" fill="#3a2418" />
                    <rect x="84" y="68" width="8" height="16" fill="#3a2418" />
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
              <!-- 精密浅钛银中框机身 -->
              <div class="phone-chassis">
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
// 与项目完全契合的高质感米白纸质与水墨朱红设计体系
$c-bg: #f7f4ed;
$c-bg-card: #fffdfa;
$c-primary: #c9341e;
$c-primary-hover: #b02713;
$c-text-main: #3a2418;
$c-text-muted: #6e584a;
$c-border-soft: #e5ded3;
$c-border-strong: #3a2418;

.landing-viewport {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  background-color: $c-bg;
  background-image:
    radial-gradient(
      circle at 12% 18%,
      rgb(201 52 30 / 3.5%) 0%,
      transparent 35%
    ),
    radial-gradient(
      circle at 88% 82%,
      rgb(216 192 139 / 20%) 0%,
      transparent 45%
    );
  color: $c-text-main;
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

// ---------------- 柔和暖色环境光晕 ----------------
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;

  &--warm {
    width: 600px;
    height: 600px;
    top: -100px;
    right: 5%;
    background: radial-gradient(
      circle,
      rgb(240 215 160 / 35%) 0%,
      transparent 70%
    );
  }

  &--red {
    width: 500px;
    height: 500px;
    bottom: -80px;
    left: 2%;
    background: radial-gradient(
      circle,
      rgb(201 52 30 / 7%) 0%,
      transparent 70%
    );
  }
}

// ---------------- 顶部极简毛玻璃导航 ----------------
.landing-header {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid rgb(58 36 24 / 8%);
  background: rgb(247 244 237 / 88%);
  backdrop-filter: blur(16px);
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
      background: $c-primary;
      color: #fff;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 1px;
      padding: 3px 8px;
      border-radius: 4px;
      transform: rotate(-2deg);
      box-shadow: 2px 2px 0 rgb(58 36 24 / 20%);
    }

    .brand-title {
      margin: 0;
      font-size: 19px;
      font-weight: 900;
      font-family: var(--ft-font-family-title, serif);
      color: $c-text-main;
      line-height: 1.2;
    }

    .brand-caption {
      font-size: 11px;
      color: $c-text-muted;
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
      color: $c-text-muted;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 10px;
      transition: color 0.2s ease;

      &:hover {
        color: $c-primary;
      }
    }

    .header-cta-btn {
      display: inline-flex;
      align-items: center;
      padding: 7px 18px;
      background: rgb(58 36 24 / 6%);
      color: $c-text-main;
      border: 1px solid rgb(58 36 24 / 16%);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;

      &:hover {
        background: $c-primary;
        color: #fff;
        border-color: $c-primary;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgb(201 52 30 / 25%);
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
  padding: 36px 0;

  &__container {
    max-width: 1240px;
    width: 100%;
    margin: 0 auto;
    padding: 0 28px;
    display: grid;
    grid-template-columns: 1.18fr 1fr;
    align-items: center;
    gap: 56px;

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 36px;
      padding: 20px;
    }
  }
}

// ---------------- 左侧文案与下载操作 ----------------
.hero-left {
  .badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    border: 1px solid $c-border-soft;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: $c-text-muted;
    box-shadow: 0 2px 6px rgb(58 36 24 / 5%);
    margin-bottom: 22px;

    .pulse-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: $c-primary;
      box-shadow: 0 0 8px rgb(201 52 30 / 60%);
    }
  }

  .hero-headline {
    margin: 0 0 18px;
    font-size: clamp(38px, 5.2vw, 56px);
    font-weight: 900;
    line-height: 1.15;
    font-family: var(--ft-font-family-title, serif);
    color: $c-text-main;
    letter-spacing: -0.5px;

    .headline-gradient {
      color: $c-primary;
      display: inline-block;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: 2px;
        width: 100%;
        height: 8px;
        background: rgb(238 197 63 / 35%);
        z-index: -1;
        border-radius: 4px;
      }
    }
  }

  .hero-subtext {
    margin: 0 0 32px;
    font-size: clamp(16px, 1.8vw, 18px);
    line-height: 1.7;
    color: $c-text-muted;
    max-width: 530px;

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
    gap: 18px;
    margin-bottom: 18px;
    flex-wrap: wrap;

    @media (max-width: 960px) {
      justify-content: center;
    }

    @media (max-width: 520px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  // 经典朱红主下载大按钮
  .cta-download-btn {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 16px;
    padding: 15px 32px;
    background: linear-gradient(135deg, $c-primary 0%, #aa230e 100%);
    border: 1px solid #991d0a;
    border-radius: 16px;
    color: #fff;
    text-decoration: none;
    box-shadow:
      0 10px 24px rgb(201 52 30 / 32%),
      0 4px 0 #8b1806;
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);

    &:hover {
      transform: translateY(-2px);
      box-shadow:
        0 14px 28px rgb(201 52 30 / 40%),
        0 6px 0 #8b1806;
      background: linear-gradient(135deg, #d63820 0%, #b82813 100%);

      .btn-shimmer {
        transform: translateX(100%);
      }
    }

    &:active {
      transform: translateY(2px);
      box-shadow:
        0 4px 12px rgb(201 52 30 / 25%),
        0 2px 0 #8b1806;
    }

    .btn-icon {
      width: 40px;
      height: 40px;
      background: rgb(255 255 255 / 18%);
      border-radius: 10px;
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
        color: rgb(255 255 255 / 85%);
      }
    }

    .btn-shimmer {
      position: absolute;
      top: 0;
      left: -100%;
      width: 80%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgb(255 255 255 / 25%),
        transparent
      );
      transform: skewX(-20deg);
      transition: transform 0.8s ease;
      pointer-events: none;
    }
  }

  // 扫码微卡（白底米褐边框）
  .qr-chip-card {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: $c-bg-card;
    border: 1px solid $c-border-soft;
    padding: 9px 15px;
    border-radius: 14px;
    box-shadow: 0 4px 12px rgb(58 36 24 / 6%);
    transition: all 0.2s ease;

    &:hover {
      border-color: $c-primary;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgb(58 36 24 / 10%);
    }

    .qr-thumb {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid #ebd9c2;

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
        font-weight: 800;
        color: $c-text-main;
      }

      .qr-sub {
        font-size: 11px;
        color: $c-text-muted;
      }
    }
  }

  .spec-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: $c-text-muted;

    @media (max-width: 960px) {
      justify-content: center;
    }

    .spec-divider {
      color: rgb(58 36 24 / 20%);
    }
  }
}

// ---------------- 右侧：浅钛金高精度 3D 拟物机身 ----------------
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

  // 精密浅钛金白外壳
  .phone-chassis {
    position: relative;
    z-index: 2;
    background: #2b231d;
    border: 9px solid #e5ded3;
    border-radius: 46px;
    box-shadow:
      0 24px 50px rgb(58 36 24 / 18%),
      0 0 0 1px rgb(58 36 24 / 12%),
      inset 0 0 3px rgb(0 0 0 / 25%);
    overflow: hidden;
  }

  .phone-island {
    position: absolute;
    top: 9px;
    left: 50%;
    transform: translateX(-50%);
    width: 68px;
    height: 16px;
    background: #1a1410;
    border-radius: 20px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;

    .island-camera {
      width: 6px;
      height: 6px;
      background: #2a333d;
      border-radius: 50%;
    }
  }

  .phone-display {
    position: relative;
    width: 100%;
    background: #fff;
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
        rgb(255 255 255 / 22%) 50%,
        transparent 65%
      );
      pointer-events: none;
      z-index: 6;
    }
  }

  .phone-shadow {
    position: absolute;
    bottom: -28px;
    left: 8%;
    width: 84%;
    height: 26px;
    background: radial-gradient(
      ellipse at center,
      rgb(58 36 24 / 28%) 0%,
      transparent 75%
    );
    filter: blur(8px);
    z-index: 1;
    pointer-events: none;
  }
}

// ---------------- 极简单屏底部栏 ----------------
.landing-footer {
  position: relative;
  z-index: 10;
  border-top: 1px solid rgb(58 36 24 / 8%);
  padding: 15px 0;
  background: rgb(247 244 237 / 85%);

  &__inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: $c-text-muted;
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
      color: $c-text-muted;
      text-decoration: none;
      background: transparent;
      border: none;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      transition: color 0.2s ease;

      &:hover {
        color: $c-primary;
      }
    }
  }
}

// ---------------- 下载 Toast ----------------
.download-toast {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 999;
  background: #fff;
  border: 1px solid rgb(58 36 24 / 16%);
  border-radius: 14px;
  padding: 14px 18px;
  box-shadow: 0 12px 32px rgb(58 36 24 / 18%);
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
      font-weight: 800;
      color: $c-text-main;
      margin-bottom: 2px;
    }

    .toast-subline {
      font-size: 12px;
      color: $c-text-muted;
      line-height: 1.4;
    }
  }

  .toast-dismiss {
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;

    &:hover {
      color: $c-text-main;
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
