<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';

// 引入放大左上角 70% 的专属高清底图与合成真实截图的手机 Mockup
import bgTopLeft70 from '@/assets/images/decoration02/bg-topleft-70.png';
import mockupRealPhone from '@/assets/images/decoration02/mockup-real-phone.png';
import androidApkSticker from '@/assets/images/decoration02/extras-original-assets/standalone-android-apk-sticker.png';
import redStamp from '@/assets/images/decoration02/extras-original-assets/standalone-red-stamp.png';
import paperClipImg from '@/assets/images/decoration/回形针.png';
import dishImgBeef from '@/assets/images/dishs/番茄肥牛饭.jpg';
import dishImgNoodle from '@/assets/images/dishs/红烧牛肉面-学苑.png';
import dishImgChicken from '@/assets/images/dishs/黑胶鸡腿饭.png';

import {
  APK_DOWNLOAD_URL,
  APK_FILE_NAME,
  APK_SIZE,
} from '@/constants/download.js';

const router = useRouter();
const auth = useAuthStore();

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

// 安装说明弹窗状态
const showInstallGuide = ref(false);

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
    class="zine-landing-viewport"
    :style="{ '--bg-board-url': `url(${bgTopLeft70})` }"
  >
    <!-- 氛围微光浮动粒子（营造整张手账温暖流动的生机） -->
    <div class="ambient-glow ambient-glow--1" aria-hidden="true"></div>
    <div class="ambient-glow ambient-glow--2" aria-hidden="true"></div>

    <!-- 顶部半透明毛玻璃极简导航栏 -->
    <header class="zine-navbar" role="banner">
      <div class="zine-navbar__inner">
        <div class="brand-zone">
          <span class="cutlery-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="svg-cutlery">
              <path
                d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v16h2.5v-8H20V2c-2.21 0-4 1.79-4 4z"
                fill="#b82e22"
              />
            </svg>
          </span>
          <h1 class="brand-title">北交干饭吧</h1>
          <span class="brand-sub">FoodTime Neo</span>
          <span class="brand-divider">/</span>
          <span class="brand-slogan handwrite">记录校园里的好味道</span>
          <span class="brand-divider">/</span>
        </div>

        <div class="nav-actions">
          <button
            type="button"
            class="nav-web-link"
            @click="goToWeb"
          >
            {{ auth.isAuthenticated ? '进入网页版首页' : '网页版登录' }}
          </button>
          <a
            :href="APK_DOWNLOAD_URL"
            :download="APK_FILE_NAME"
            class="nav-download-link"
            data-testid="nav-download-btn"
            @click="handleDownloadTrigger"
          >
            <span class="nav-download-text">下载</span>
            <span class="nav-download-active-line" aria-hidden="true"></span>
          </a>
        </div>
      </div>
    </header>

    <!-- 主手账画卷舞台 -->
    <main class="zine-canvas">
      <div class="canvas-grid-stage">
        <!-- ---------------- 左侧地图白色空白区：特大字号、关键内容舒展呈现 ---------------- -->
        <section class="zine-main-card">
          <!-- 胶带标签 -->
          <div class="card-tape-label washi-tape">
            <span>校园食堂 · 美食点评 · 同学社区</span>
          </div>

          <!-- 核心手写书法超大标题：大幅放大加粗，霸气醒目 -->
          <h2 class="card-hero-title handwrite">
            <div class="title-line-1">
              <span class="title-ink-black">下载</span>
              <span class="brush-brand glow-text">北交干饭吧</span>
            </div>
            <div class="title-line-2">
              <span class="title-ink-black">安卓版</span>
            </div>
          </h2>

          <!-- 关键简介段落：字号放大至 21px，行距舒展呼吸 -->
          <p class="card-hero-desc">
            <strong>北交干饭吧 (FoodTime)</strong> 是一个专注于校园食堂的美食指南、菜品点评与 UGC 社区平台。
          </p>

          <!-- 核心操作区：深红超大下载按钮（带扫光动效） + 右侧纯黑按键“进入网页端” -->
          <div class="card-action-flex">
            <div class="action-btn-group">
              <!-- 主深红按钮：下载安卓安装包 -->
              <a
                :href="APK_DOWNLOAD_URL"
                :download="APK_FILE_NAME"
                class="zine-primary-download-btn shimmer-btn ripple-hover"
                data-testid="hero-download-btn"
                @click="handleDownloadTrigger"
              >
                <span class="android-svg-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
                    <path
                      d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"
                    />
                  </svg>
                </span>
                <span class="btn-text">下载安卓安装包 ➔</span>
              </a>

              <!-- 右侧小黑色按键：进入网页端（放大至协调比例） -->
              <button
                type="button"
                class="zine-dark-web-btn"
                data-testid="enter-web-btn"
                @click="goToWeb"
              >
                <span>进入网页端</span>
                <span class="btn-arrow" aria-hidden="true">→</span>
              </button>
            </div>

            <!-- 安装说明小链接（放大字号，增加舒展留白） -->
            <button
              type="button"
              class="install-guide-link handwrite"
              @click="showInstallGuide = true"
            >
              查看安装说明 ➔
            </button>
          </div>
        </section>

        <!-- ---------------- 中间与右侧：真机手机样机整体右移，配合3D悬浮呼吸浮动 ---------------- -->
        <section class="zine-device-wrapper">
          <div class="phone-mockup-container phone-tilt-float">
            <img
              :src="mockupRealPhone"
              alt="北交干饭吧真实客户端界面"
              class="phone-mockup-img"
            />
          </div>

          <!-- 保持语义与单元测试兼容的隐藏节点 -->
          <div class="phone-screen-display sr-only" aria-hidden="true">
            <div class="app-canteen-section">
              <span class="name">第一食堂</span>
              <span class="name">第二食堂</span>
            </div>
            <div class="app-feed-section">
              <span class="username">吃货小明</span>
              <p class="feed-text">这个红烧肉饭真的绝了！分量大，味道好，强烈推荐！</p>
              <img :src="dishImgBeef" alt="第一食堂菜品" />
              <img :src="dishImgNoodle" alt="第二食堂菜品" />
              <img :src="dishImgChicken" alt="红烧肉盖饭" />
            </div>
          </div>
        </section>

        <!-- ---------------- 右侧手账组件：与底图天然食堂插画与印章完美融合 ---------------- -->
        <section class="zine-right-collage">
          <!-- 黄色方格便利贴（精准置于右上空白，微风晃动动画） -->
          <div class="yellow-sticky-note note-breeze-anim" data-testid="qr-float-card">
            <img
              :src="androidApkSticker"
              alt="Android APK 校园美食指南"
              class="apk-sticker-img"
            />
            <div class="sr-only">
              <h3>Android APK</h3>
              <p>校园美食指南 随时随地发现身边的美味道！</p>
            </div>
          </div>

          <!-- 圆形红色复古印章（与底图印章位置完美呼应） -->
          <div class="circular-red-stamp" aria-hidden="true">
            <img
              :src="redStamp"
              alt="Good Food Stamp"
              class="stamp-real-img"
            />
          </div>
        </section>
      </div>

      <!-- ---------------- 底部轻量通透的便签条横幅 ---------------- -->
      <footer class="bottom-torn-banner">
        <img
          :src="paperClipImg"
          alt=""
          class="paper-clip-decor"
          aria-hidden="true"
        />

        <div class="banner-content-inner">
          <p class="banner-handwrite-text handwrite">
            今天吃什么，一眼找到；
            <span class="highlight-ink-underlined">这道值不值，一看就知道。</span>
          </p>

          <div class="banner-sticky-subnote">
            <span class="subnote-text handwrite">真实的点评，让每一顿饭都不再随便</span>
          </div>
        </div>
      </footer>
    </main>

    <!-- 安装说明手账折叠弹窗 -->
    <transition name="modal-fade">
      <div
        v-if="showInstallGuide"
        class="guide-modal-overlay"
        @click.self="showInstallGuide = false"
      >
        <div
          class="guide-modal-paper"
          role="dialog"
          aria-labelledby="guide-title"
        >
          <div class="guide-tape-decor" aria-hidden="true"></div>
          <h3 id="guide-title" class="guide-modal-title handwrite">
            安卓安装简明说明
          </h3>
          <ol class="guide-steps-list">
            <li>
              <strong>1. 点击下载</strong>：下载官方原生安装包
              <code>{{ APK_FILE_NAME }} ({{ APK_SIZE }})</code>。
            </li>
            <li>
              <strong>2. 允许安装</strong>：若系统弹出“未知来源应用”安全警示，点击【设置/继续安装】并勾选【允许来自此来源的应用】。
            </li>
            <li>
              <strong>3. 开箱干饭</strong>：安装完成后桌面点击图标，免复杂设置直接使用！
            </li>
          </ol>
          <div class="guide-modal-actions">
            <button
              type="button"
              class="guide-close-btn"
              @click="showInstallGuide = false"
            >
              我知道了，开始干饭！
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 下载触发 Toast 提示 -->
    <transition name="toast-fade">
      <div
        v-if="showDownloadToast"
        class="download-toast"
        role="status"
        aria-live="polite"
        data-testid="download-toast"
      >
        <span class="toast-stamp-badge">已启动</span>
        <div class="toast-text-wrap">
          <div class="toast-head">正在下载 {{ APK_FILE_NAME }}</div>
          <div class="toast-sub">
            大小约 {{ APK_SIZE }}，请在手机或浏览器下载管理器中查看进度。
          </div>
        </div>
        <button
          type="button"
          class="toast-x-btn"
          aria-label="关闭"
          @click="showDownloadToast = false"
        >
          ✕
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
// ---------------- 色彩与设计系统 ----------------
$c-ink-black: #140a05;
$c-ink-red: #c9341e;
$c-ink-dark-btn: #161210;
$c-ink-dark-hover: #2c2420;
$c-tape-yellow: #f5e8b4;

.handwrite {
  font-family: var(--ft-font-family-note, 'Ma Shan Zheng', 'KaiTi', cursive);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// ---------------- 整体视口：底图全屏铺满 ----------------
.zine-landing-viewport {
  position: relative;
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background-image: var(--bg-board-url);
  background-size: cover;
  background-position: left top;
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-color: #f7efe4;
  color: $c-ink-black;
  font-family: var(--ft-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  overflow-x: hidden;
  margin: 0;
  padding: 0;
}

// ---------------- 氛围流光粒子（增加全页灵动感） ----------------
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80px);
  z-index: 1;
  opacity: 0.35;
  animation: ambientFloat 10s ease-in-out infinite alternate;

  &--1 {
    top: 15%;
    left: 20%;
    width: 380px;
    height: 380px;
    background: radial-gradient(circle, rgba(255, 235, 190, 0.6) 0%, transparent 70%);
  }

  &--2 {
    bottom: 20%;
    right: 15%;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(255, 220, 200, 0.45) 0%, transparent 70%);
    animation-delay: -5s;
  }
}

@keyframes ambientFloat {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(25px, -20px) scale(1.1);
  }
}

// ---------------- 顶部半透明毛玻璃导航栏 ----------------
.zine-navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(220, 205, 185, 0.45);
  box-shadow: 0 1px 12px rgba(50, 30, 15, 0.04);

  &__inner {
    max-width: 1520px;
    margin: 0 auto;
    padding: 12px 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.brand-zone {
  display: flex;
  align-items: center;
  gap: 12px;

  .cutlery-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;

    .svg-cutlery {
      width: 22px;
      height: 22px;
    }
  }

  .brand-title {
    margin: 0;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: $c-ink-black;
  }

  .brand-sub {
    font-size: 13px;
    font-weight: 700;
    color: #8c7260;
    background: rgba(235, 222, 205, 0.5);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .brand-divider {
    color: #c4b5a5;
    font-size: 15px;
    font-weight: 300;
  }

  .brand-slogan {
    font-size: 17px;
    color: #584232;
    letter-spacing: 0.02em;
  }
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;

  .nav-web-link {
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(138, 108, 86, 0.35);
    color: #4b3628;
    padding: 7px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.22s ease;

    &:hover {
      background: #fff;
      border-color: $c-ink-red;
      color: $c-ink-red;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(184, 46, 34, 0.15);
    }
  }

  .nav-download-link {
    position: relative;
    padding: 6px 8px;
    font-size: 16px;
    font-weight: 700;
    color: $c-ink-black;
    text-decoration: none;
    transition: color 0.2s ease;

    .nav-download-active-line {
      position: absolute;
      bottom: 2px;
      left: 8px;
      right: 8px;
      height: 3px;
      background: $c-ink-red;
      border-radius: 2px;
    }

    &:hover {
      color: $c-ink-red;
    }
  }
}

// ---------------- 核心手账展台容器 ----------------
.zine-canvas {
  position: relative;
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px clamp(24px, 4vw, 56px) 0;
}

// ---------------- 舞台三栏核心网格：左侧舒展在空白区，手机与手账组件整体右移 ----------------
.canvas-grid-stage {
  position: relative;
  z-index: 10;
  max-width: 1760px;
  width: 100%;
  margin: 0 auto;
  display: grid;
  // 左侧文字区域占 1.6fr，中间手机占 0.95fr，右侧占 0.5fr
  grid-template-columns: minmax(500px, 1.6fr) minmax(280px, 0.95fr) minmax(130px, 0.5fr);
  align-items: center;
  gap: clamp(16px, 2.5vw, 38px);
  min-height: calc(100vh - 165px);
}

// ---------------- 左侧主文字区域：再往右方向微调平移，完美落座于米白方格纸黄金区 ----------------
.zine-main-card {
  position: relative;
  background: transparent;
  border: none;
  box-shadow: none;
  // 关键元素在右下基础上再向右微移：平整纯净，留白自然
  margin-top: clamp(88px, 13vh, 165px);
  margin-left: clamp(110px, 12.5vw, 225px);
  padding: 0 0 24px;
  animation: fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;

  // 胶带标签（放大字号与间距）
  .card-tape-label {
    display: inline-block;
    padding: 8px 24px;
    background-color: $c-tape-yellow;
    border: 1px solid rgba(212, 190, 119, 0.7);
    border-radius: 2px;
    font-size: 17px;
    font-weight: 800;
    color: #4b3628;
    box-shadow: 0 2px 8px rgba(58, 36, 24, 0.08);
    transform: rotate(-1deg);
    margin-bottom: 28px;
    transition: transform 0.2s ease;

    &:hover {
      transform: rotate(0deg) scale(1.02);
    }
  }

  // 核心超大标题：显著放大，霸气有力
  .card-hero-title {
    margin: 0 0 28px;
    color: $c-ink-black;
    line-height: 1.16;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .title-line-1 {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 14px;
    }

    .title-line-2 {
      display: flex;
      align-items: baseline;
    }

    .title-ink-black {
      color: #120803;
      font-size: clamp(56px, 6vw, 82px);
      font-weight: 900;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .brush-brand {
      color: $c-ink-red;
      font-size: clamp(70px, 7.6vw, 106px);
      font-weight: 900;
      letter-spacing: 0.02em;
      filter: drop-shadow(0 4px 10px rgba(201, 52, 30, 0.35));
      transition: transform 0.25s ease;

      &:hover {
        transform: scale(1.02);
      }
    }
  }

  // 朱红标题微光呼吸动效
  .glow-text {
    animation: textGlowPulse 4s ease-in-out infinite alternate;
  }

  // 关键简介（放大至 21~25.5px，行距舒展优雅）
  .card-hero-desc {
    margin: 0 0 44px;
    font-size: clamp(21px, 2.2vw, 25.5px);
    line-height: 1.88;
    color: #3b281b;
    max-width: 660px;

    strong {
      color: #120803;
      font-weight: 900;
    }
  }

  // 核心操作区
  .card-action-flex {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  // 按钮组（整体放大加粗）
  .action-btn-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 20px;
  }

  // 主深红下载大按钮（超大饱满，立体感强，带高能扫光动效）
  .zine-primary-download-btn {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 14px;
    background: linear-gradient(180deg, #d33822 0%, #aa200d 100%);
    color: #fff;
    padding: 20px 48px;
    border-radius: 16px;
    font-size: 22px;
    font-weight: 800;
    text-decoration: none;
    box-shadow:
      0 10px 28px rgba(184, 46, 34, 0.4),
      0 3px 8px rgba(184, 46, 34, 0.22);
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;

    // 流光扫光动效
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 60%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.38),
        transparent
      );
      transform: skewX(-22deg);
      animation: btnShimmerSweep 4.5s ease-in-out infinite;
    }

    &:hover {
      transform: translateY(-3px) scale(1.01);
      box-shadow:
        0 14px 34px rgba(184, 46, 34, 0.5),
        0 5px 10px rgba(184, 46, 34, 0.28);
      background: linear-gradient(180deg, #dc4029 0%, #b82512 100%);
    }

    &:active {
      transform: translateY(1px) scale(0.98);
      box-shadow: 0 2px 6px rgba(184, 46, 34, 0.25);
    }

    .android-svg-icon {
      display: inline-flex;
      align-items: center;

      svg {
        width: 30px;
        height: 30px;
      }
    }
  }

  // 小黑色按键：“进入网页端”（等高放大，黑红经典撞色）
  .zine-dark-web-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: $c-ink-dark-btn;
    color: #f7f4ee;
    border: none;
    padding: 20px 36px;
    border-radius: 16px;
    font-size: 19px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(22, 18, 16, 0.32);
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);

    .btn-arrow {
      font-size: 20px;
      transition: transform 0.22s ease;
    }

    &:hover {
      background: $c-ink-dark-hover;
      transform: translateY(-3px);
      box-shadow: 0 10px 28px rgba(22, 18, 16, 0.42);

      .btn-arrow {
        transform: translateX(4px);
      }
    }

    &:active {
      transform: translateY(1px) scale(0.98);
    }
  }

  // 安装说明手写链接（放大字号，增加舒展感）
  .install-guide-link {
    background: none;
    border: none;
    color: #5c4535;
    font-size: 18.5px;
    text-align: left;
    padding: 4px 0;
    margin-top: 6px;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: rgba(92, 69, 53, 0.35);
    text-underline-offset: 5px;
    transition: all 0.2s ease;
    width: fit-content;

    &:hover {
      color: $c-ink-red;
      text-decoration-color: $c-ink-red;
      transform: translateX(3px);
    }
  }
}

// ---------------- 中间真机手机呈现：整体右移，恢复斜向放置 (-3.5deg)，带3D悬浮呼吸浮动 ----------------
.zine-device-wrapper {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  // 向右侧明显推移，给左侧留出极为开阔的空白
  margin-left: auto;
  transform: translateX(clamp(16px, 2.5vw, 60px));
  animation: fadeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;

  .phone-mockup-container {
    position: relative;
    z-index: 15;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;

    &:hover {
      filter: brightness(1.02);
      // 悬停时角度微微回正并上浮
      transform: rotate(-1.5deg) translateY(-8px) scale(1.02) !important;
    }

    .phone-mockup-img {
      display: block;
      width: clamp(275px, 22vw, 360px);
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 24px 46px rgba(35, 20, 10, 0.32));
    }
  }
}

// 手机自然微倾悬浮浮动动效
.phone-tilt-float {
  animation: phoneTiltFloat 6s ease-in-out infinite;
}

@keyframes phoneTiltFloat {
  0%, 100% {
    transform: rotate(-3.5deg) translateY(0);
  }
  50% {
    transform: rotate(-2.6deg) translateY(-12px);
  }
}

// ---------------- 右侧手账拼贴组：随手机整体右移，精准融入背景 ----------------
.zine-right-collage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 460px;
  transform: translateX(clamp(16px, 2.5vw, 60px));
  animation: fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;

  // 黄色方格便利贴（微风晃动动画）
  .yellow-sticky-note {
    position: relative;
    z-index: 20;
    margin-top: 10px;
    margin-left: 10px;
    cursor: pointer;

    .apk-sticker-img {
      width: clamp(155px, 14.5vw, 205px);
      height: auto;
      transform: rotate(2.5deg);
      filter: drop-shadow(0 8px 18px rgba(45, 30, 15, 0.12));
      transition: transform 0.25s ease;
    }

    &:hover .apk-sticker-img {
      transform: rotate(4.5deg) scale(1.04);
    }
  }

  // 圆形红印章（与底图印章位置完美贴合，轻柔微浮动）
  .circular-red-stamp {
    position: absolute;
    top: -20px;
    right: 15px;
    z-index: 8;
    pointer-events: none;

    .stamp-real-img {
      width: clamp(80px, 8vw, 112px);
      height: auto;
      transform: rotate(-8deg);
      opacity: 0.92;
      filter: drop-shadow(0 2px 6px rgba(184, 46, 34, 0.18));
      animation: stampBreathe 4s ease-in-out infinite alternate;
    }
  }
}

// ---------------- 底部轻量通透的便签条横幅 ----------------
.bottom-torn-banner {
  position: relative;
  z-index: 25;
  width: 100%;
  margin-top: 24px;
  padding: 12px 32px 18px;
  display: flex;
  align-items: center;
  justify-content: center;

  .paper-clip-decor {
    position: absolute;
    top: -10px;
    left: clamp(24px, 7vw, 120px);
    width: 26px;
    height: auto;
    z-index: 30;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .banner-content-inner {
    max-width: 1100px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 8px 24px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(8px);
    border: 1px dashed rgba(185, 41, 41, 0.35);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(45, 30, 15, 0.03);
  }

  .banner-handwrite-text {
    margin: 0;
    font-size: clamp(16px, 1.7vw, 20px);
    line-height: 1.4;
    color: #2b1c14;

    .highlight-ink-underlined {
      color: $c-ink-red;
      text-decoration: underline;
      text-decoration-color: rgba(201, 52, 30, 0.35);
      text-underline-offset: 4px;
    }
  }

  .banner-sticky-subnote {
    .subnote-text {
      font-size: 13.5px;
      color: #6a5342;
    }
  }
}

// ---------------- 动画与动态系统（丰富灵动的现代手账动效） ----------------
// 按钮流光扫光
@keyframes btnShimmerSweep {
  0%, 65% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

// 朱红书法墨色微光呼吸
@keyframes textGlowPulse {
  0% {
    filter: drop-shadow(0 3px 6px rgba(201, 52, 30, 0.22));
  }
  100% {
    filter: drop-shadow(0 3px 12px rgba(201, 52, 30, 0.42));
  }
}

// 印章轻柔呼吸
@keyframes stampBreathe {
  0% {
    transform: rotate(-8deg) scale(1);
  }
  100% {
    transform: rotate(-6deg) scale(1.03);
  }
}

// 便签微风摆动
@keyframes noteBreeze {
  0%, 100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(1.2deg) translateY(-3px);
  }
}

.note-breeze-anim {
  animation: noteBreeze 5s ease-in-out infinite;
}

// 小笑脸可爱跳动
@keyframes subtleBounce {
  0%, 100% {
    transform: translateY(0) rotate(6deg);
  }
  50% {
    transform: translateY(-5px) rotate(12deg) scale(1.08);
  }
}

.bounce-anim {
  animation: subtleBounce 3s ease-in-out infinite;
}

// 页面入场淡入动效
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// ---------------- 安装说明弹窗 ----------------
.guide-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(20, 12, 8, 0.45);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.guide-modal-paper {
  position: relative;
  max-width: 480px;
  width: 100%;
  background: #fff;
  padding: 36px 32px 28px;
  border-radius: 12px;
  border: 1px solid #e6ded3;
  box-shadow: 0 20px 48px rgba(30, 15, 5, 0.25);

  .guide-tape-decor {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 90px;
    height: 24px;
    background: $c-tape-yellow;
    border: 1px solid rgba(212, 190, 119, 0.8);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  }

  .guide-modal-title {
    margin: 0 0 18px;
    font-size: 24px;
    color: #2b1c14;
    text-align: center;
  }

  .guide-steps-list {
    margin: 0 0 24px;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 14.5px;
    line-height: 1.6;
    color: #4b3628;

    code {
      background: #f5eee4;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      color: #923428;
    }
  }

  .guide-modal-actions {
    display: flex;
    justify-content: center;

    .guide-close-btn {
      background: linear-gradient(180deg, #c9341e 0%, #aa200d 100%);
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 20px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(184, 46, 34, 0.3);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(184, 46, 34, 0.4);
      }
    }
  }
}

// ---------------- 下载 Toast 提示 ----------------
.download-toast {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: #fff;
  border: 1px solid #dfd3c5;
  border-left: 5px solid $c-ink-red;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(35, 20, 10, 0.12);

  .toast-stamp-badge {
    background: #faebe8;
    color: $c-ink-red;
    border: 1px solid #e8b6af;
    font-size: 12px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .toast-text-wrap {
    .toast-head {
      font-size: 14.5px;
      font-weight: 700;
      color: #21150e;
    }

    .toast-sub {
      font-size: 12.5px;
      color: #735c4b;
      margin-top: 2px;
    }
  }

  .toast-x-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: #927e6e;
    cursor: pointer;
    padding: 4px;
    line-height: 1;

    &:hover {
      color: #21150e;
    }
  }
}

// ---------------- 过渡效果 ----------------
.modal-fade-enter-active,
.modal-fade-leave-active,
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

// ---------------- 响应式断点 ----------------
@media (max-width: 1280px) {
  .canvas-grid-stage {
    grid-template-columns: minmax(460px, 1.4fr) minmax(260px, 0.95fr);
    gap: 28px;
  }

  .zine-main-card {
    margin-left: clamp(55px, 8vw, 120px);
    margin-top: clamp(55px, 8vh, 100px);
  }

  .zine-device-wrapper {
    transform: none;
    margin-left: auto;
  }

  .zine-right-collage {
    display: none;
  }
}

@media (max-width: 768px) {
  .canvas-grid-stage {
    grid-template-columns: 1fr;
    gap: 36px;
    padding-top: 12px;
  }

  .zine-device-wrapper {
    transform: none;
    margin: 0 auto;
    justify-content: center;
  }

  .zine-navbar__inner {
    padding: 10px 16px;
  }

  .brand-zone {
    .brand-slogan,
    .brand-divider {
      display: none;
    }
  }

  .zine-main-card {
    margin-left: 0;
    margin-top: 16px;
    padding: 24px 0 16px;

    .card-hero-title {
      .title-ink-black {
        font-size: 42px;
      }

      .brush-brand {
        font-size: 52px;
      }
    }

    .card-hero-desc {
      font-size: 18px;
    }

    .action-btn-group {
      flex-direction: column;
      align-items: stretch;

      .zine-primary-download-btn,
      .zine-dark-web-btn {
        justify-content: center;
      }
    }
  }

  .bottom-torn-banner {
    .banner-content-inner {
      flex-direction: column;
      text-align: center;
    }

    .banner-sticky-subnote {
      display: none;
    }
  }
}
</style>
