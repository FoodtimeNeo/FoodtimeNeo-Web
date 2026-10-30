<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import paperClipImg from '@/assets/images/decoration/回形针.png';
import tapeRedImg from '@/assets/images/decoration/纸胶带.png';
import tapeBlueImg from '@/assets/images/decoration/纸胶带02.png';
import canteenSketchImg from '@/assets/images/decoration/canteen-sketch.png';
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
  <div class="zine-landing-viewport">
    <!-- 顶部贴合参考图的极简导航栏 -->
    <header class="zine-navbar" role="banner">
      <div class="zine-navbar__inner">
        <div class="brand-zone">
          <span class="cutlery-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="svg-cutlery">
              <path
                d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v16h2.5v-8H20V2c-2.21 0-4 1.79-4 4z"
                fill="#c9341e"
              />
            </svg>
          </span>
          <h1 class="brand-title">FoodTime Neo</h1>
          <span class="brand-divider">/</span>
          <span class="brand-slogan handwrite">记录校园里的好味道</span>
          <span class="brand-divider">/</span>
        </div>

        <div class="nav-actions">
          <button
            type="button"
            class="nav-web-link"
            data-testid="enter-web-btn"
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
            下载
          </a>
        </div>
      </div>
    </header>

    <!-- 核心手账拼贴主画布 (Collage Main Canvas) -->
    <main class="zine-canvas">
      <!-- 装饰性背景贴纸与胶带 -->
      <img
        :src="tapeBlueImg"
        alt=""
        class="decor-tape decor-tape--top-left"
        aria-hidden="true"
      />
      <img
        :src="tapeRedImg"
        alt=""
        class="decor-tape decor-tape--mid-left"
        aria-hidden="true"
      />
      <div
        class="decor-torn-patch decor-torn-patch--left"
        aria-hidden="true"
      ></div>

      <div class="canvas-grid-stage">
        <!-- ---------------- 左侧方格手账核心便签卡片 ---------------- -->
        <section class="zine-main-card">
          <!-- 卡片顶部小胶带标签 -->
          <div class="card-tape-label">
            <span>校园食堂 · 美食点评 · 同学社区</span>
          </div>

          <!-- 核心大标题 -->
          <h2 class="card-hero-title handwrite">
            下载 <span class="brush-brand">FoodTime</span> 安卓版
          </h2>

          <!-- 简介说明 -->
          <p class="card-hero-desc">
            FoodTime 是一个专注于校园食堂的美食指南、菜品点评与 UGC 社区平台。
          </p>

          <!-- 核心下载按钮与清单行 -->
          <div class="card-action-flex">
            <div class="action-btn-col">
              <a
                :href="APK_DOWNLOAD_URL"
                :download="APK_FILE_NAME"
                class="zine-primary-download-btn"
                data-testid="hero-download-btn"
                @click="handleDownloadTrigger"
              >
                <span class="android-svg-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
                    <path
                      d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"
                    />
                  </svg>
                </span>
                <span class="btn-text">下载安卓安装包 ➔</span>
              </a>

              <button
                type="button"
                class="install-guide-link handwrite"
                @click="showInstallGuide = true"
              >
                查看安装说明 ➔
              </button>
            </div>

            <!-- 右侧手写清单与笑脸 -->
            <div class="card-features-note">
              <ul class="handwrite-bullet-list handwrite">
                <li>· 发现好吃的食堂</li>
                <li>· 记录真实的味道</li>
                <li>· 和同学一起分享</li>
              </ul>
              <div class="handwrite-smile" aria-hidden="true">
                <svg viewBox="0 0 36 36" width="30" height="30">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#3a2418"
                    stroke-width="2"
                  />
                  <circle cx="13" cy="14" r="1.8" fill="#3a2418" />
                  <circle cx="23" cy="14" r="1.8" fill="#3a2418" />
                  <path
                    d="M12 21c2 3.5 10 3.5 12 0"
                    fill="none"
                    stroke="#3a2418"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- 左下角黑白印章 -->
          <div class="mood-stamp-badge" aria-hidden="true">
            <span class="stamp-line">GOOD</span>
            <span class="stamp-line">FOOD</span>
            <span class="stamp-line">GOOD</span>
            <span class="stamp-line">MOOD :)</span>
          </div>
        </section>

        <!-- ---------------- 中间：高拟真圆角手机 App 呈现 ---------------- -->
        <section class="zine-device-wrapper">
          <div class="device-phone-body">
            <!-- 手机黑色圆角外框 -->
            <div class="phone-screen-display">
              <!-- 顶部状态栏 -->
              <div class="screen-status-bar">
                <span class="status-time">9:41</span>
                <div class="status-speaker-notch"></div>
                <div class="status-icons">📶 🔋</div>
              </div>

              <!-- App 顶栏 -->
              <div class="app-view-header">
                <div class="user-avatar-placeholder">
                  <img :src="dishImgBeef" alt="" class="avatar-dish-img" />
                </div>
                <div class="app-brand-center">
                  <span class="app-logo-text handwrite">FoodTime</span>
                  <span class="app-slogan-text">发现校园里的好味道</span>
                </div>
                <div class="app-header-bell">🔔</div>
              </div>

              <!-- 搜索栏 -->
              <div class="app-search-box">
                <span class="search-icon">🔍</span>
                <span class="search-placeholder">搜索食堂、菜品、学校...</span>
              </div>

              <!-- 四大分类快捷圆角图标 -->
              <div class="app-quick-icons">
                <div class="quick-icon-item">
                  <div class="icon-circle icon-circle--red">🍱</div>
                  <span>食堂</span>
                </div>
                <div class="quick-icon-item">
                  <div class="icon-circle icon-circle--yellow">🍲</div>
                  <span>菜品</span>
                </div>
                <div class="quick-icon-item">
                  <div class="icon-circle icon-circle--green">🏆</div>
                  <span>排行榜</span>
                </div>
                <div class="quick-icon-item">
                  <div class="icon-circle icon-circle--blue">💬</div>
                  <span>社区</span>
                </div>
              </div>

              <!-- 附近的食堂 -->
              <div class="app-canteen-section">
                <div class="section-title-row">
                  <span class="section-title-bold">附近的食堂</span>
                  <span class="section-more-link">查看更多 &gt;</span>
                </div>

                <div class="canteen-mini-card">
                  <img
                    :src="dishImgBeef"
                    alt="第一食堂"
                    class="mini-dish-thumb"
                  />
                  <div class="mini-canteen-info">
                    <div class="canteen-name-row">
                      <span class="name">第一食堂</span>
                      <span class="score">★ 4.6</span>
                      <span class="reviews">328条点评</span>
                    </div>
                    <div class="canteen-dist">📍 320m</div>
                    <div class="canteen-tag-row">
                      <span class="mini-tag">菜品丰富</span>
                      <span class="mini-tag">价格实惠</span>
                    </div>
                  </div>
                </div>

                <div class="canteen-mini-card">
                  <img
                    :src="dishImgNoodle"
                    alt="第二食堂"
                    class="mini-dish-thumb"
                  />
                  <div class="mini-canteen-info">
                    <div class="canteen-name-row">
                      <span class="name">第二食堂</span>
                      <span class="score">★ 4.3</span>
                      <span class="reviews">185条点评</span>
                    </div>
                    <div class="canteen-dist">📍 450m</div>
                    <div class="canteen-tag-row">
                      <span class="mini-tag">档口多</span>
                      <span class="mini-tag">味道不错</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 同学们都在哪（真实大图食评打卡） -->
              <div class="app-feed-section">
                <div class="feed-header-row">
                  <span class="section-title-bold">同学们都在哪</span>
                </div>
                <div class="feed-post-card">
                  <div class="feed-user-bar">
                    <div class="feed-user-avatar">👦</div>
                    <div class="feed-user-info">
                      <span class="username">吃货小明</span>
                      <span class="post-time">2小时前</span>
                    </div>
                  </div>
                  <p class="feed-text">
                    “这个红烧肉绝绝子了！分量大、味道好，强烈推荐！”
                  </p>
                  <div class="feed-dish-image-wrapper">
                    <img
                      :src="dishImgChicken"
                      alt="红烧肉盖饭"
                      class="feed-dish-big-img"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ---------------- 右侧手账拼贴组（便利贴、圆章、插画） ---------------- -->
        <section class="zine-right-collage">
          <!-- 黄色便利贴（Android APK） -->
          <div class="yellow-sticky-note" data-testid="qr-float-card">
            <div class="sticky-tape-pin" aria-hidden="true"></div>
            <div class="sticky-icon-android">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="#5b9b42">
                <path
                  d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"
                />
              </svg>
            </div>
            <h3 class="sticky-title">Android APK</h3>
            <p class="sticky-slogan handwrite">
              校园美食指南<br />
              随时随地发现身边的美味道！
            </p>
          </div>

          <!-- 红色圆形复古印章 -->
          <div class="circular-red-stamp" aria-hidden="true">
            <svg viewBox="0 0 120 120" class="svg-stamp">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#b72f1c"
                stroke-width="3"
                stroke-dasharray="6,3"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="#b72f1c"
                stroke-width="1.8"
              />
              <path
                id="stampTextPath"
                d="M 22 60 A 38 38 0 1 1 98 60 A 38 38 0 1 1 22 60"
                fill="none"
              />
              <text
                font-size="9.5"
                fill="#b72f1c"
                font-weight="900"
                letter-spacing="2"
              >
                <textPath href="#stampTextPath" startOffset="5%">
                  GOOD FOOD FOR A BETTER CAMPUS
                </textPath>
              </text>
              <text
                x="60"
                y="65"
                font-size="14"
                fill="#b72f1c"
                text-anchor="middle"
                font-family="serif"
                font-weight="bold"
              >
                🍴
              </text>
            </svg>
          </div>

          <!-- 右上方手绘涂鸦“好吃的总在校园里 :)” + 箭头 -->
          <div class="doodle-quote-arrow" aria-hidden="true">
            <div class="doodle-text handwrite">好吃的<br />总在校园里 :)</div>
            <svg
              viewBox="0 0 60 40"
              class="doodle-curved-arrow"
              fill="none"
              stroke="#2c4c64"
              stroke-width="2.5"
              stroke-linecap="round"
            >
              <path d="M 50 8 C 40 28, 25 32, 10 25" />
              <polyline points="18,18 10,25 15,34" />
            </svg>
          </div>

          <!-- 右下方复古钢笔速写插画：食堂 CANTEEN -->
          <div class="canteen-sketch-card" aria-hidden="true">
            <img
              :src="canteenSketchImg"
              alt="校园食堂插画"
              class="canteen-sketch-img"
            />
          </div>
        </section>
      </div>

      <!-- ---------------- 底部横贯的大撕纸横幅 ---------------- -->
      <footer class="bottom-torn-banner">
        <!-- 金属回形针真实质感 -->
        <img
          :src="paperClipImg"
          alt=""
          class="paper-clip-decor"
          aria-hidden="true"
        />

        <div class="banner-content-inner">
          <p class="banner-handwrite-text handwrite">
            今天吃什么，一眼找到；<br class="mobile-break" />
            <span class="highlight-ink-underlined"
              >这道值不值，一看就知道。</span
            >
          </p>

          <!-- 右下侧贴着的小方折角便签 -->
          <div class="banner-sticky-subnote">
            <p class="subnote-text handwrite">
              真实的点评<br />
              让每一顿饭<br />
              都不再随便
            </p>
            <div class="subnote-rice-doodle" aria-hidden="true">
              <svg viewBox="0 0 40 36" width="36" height="32">
                <!-- 冒出的三缕热气 -->
                <path
                  d="M14 8 C13 4, 15 2, 14 0"
                  fill="none"
                  stroke="#c9341e"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M20 7 C19 3, 21 1, 20 0"
                  fill="none"
                  stroke="#c9341e"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <path
                  d="M26 8 C25 4, 27 2, 26 0"
                  fill="none"
                  stroke="#c9341e"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <!-- 碗与米饭 -->
                <path
                  d="M8 18 C8 12, 32 12, 32 18 Z"
                  fill="#f7efe2"
                  stroke="#3a2418"
                  stroke-width="2"
                />
                <path
                  d="M6 18 C6 28, 34 28, 34 18 Z"
                  fill="#fff"
                  stroke="#3a2418"
                  stroke-width="2"
                />
                <line
                  x1="14"
                  y1="28"
                  x2="26"
                  y2="28"
                  stroke="#3a2418"
                  stroke-width="2.5"
                />
              </svg>
            </div>
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
              <strong>2. 允许安装</strong
              >：若系统弹出“未知来源应用”安全警示，点击【设置/继续安装】并勾选【允许来自此来源的应用】。
            </li>
            <li>
              <strong>3. 开箱干饭</strong
              >：安装完成后桌面点击图标，免复杂设置直接使用！
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
// ---------------- 色彩与质感系统 ----------------
$c-kraft-bg: #dfd1be;
$c-grid-paper: #fdfbf7;
$c-grid-line: rgb(58 36 24 / 7.5%);
$c-ink-black: #261913;
$c-ink-red: #c9341e;
$c-ink-red-strong: #aa200d;
$c-ink-muted: #6a5345;
$c-tape-yellow: #f2e2a8;
$c-tape-border: #d4be77;

.handwrite {
  font-family: var(--ft-font-family-note, 'Ma Shan Zheng', 'KaiTi', cursive);
}

.zine-landing-viewport {
  position: relative;
  min-height: 100vh;
  background-color: $c-kraft-bg;
  background-image:
    radial-gradient(
      circle at 50% 50%,
      rgb(255 255 255 / 15%) 0%,
      transparent 80%
    ),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgb(58 36 24 / 1.5%) 10px,
      rgb(58 36 24 / 1.5%) 20px
    );
  color: $c-ink-black;
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
}

// ---------------- 顶部导航 ----------------
.zine-navbar {
  position: relative;
  z-index: 20;
  padding: 16px 0;
  background: rgb(245 238 228 / 85%);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgb(58 36 24 / 10%);

  &__inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .brand-zone {
    display: flex;
    align-items: center;
    gap: 10px;

    .svg-cutlery {
      display: block;
    }

    .brand-title {
      margin: 0;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.3px;
      color: $c-ink-black;
      font-family: var(--ft-font-family, sans-serif);
    }

    .brand-divider {
      color: #9c8a7d;
      font-weight: 300;
      font-size: 16px;
    }

    .brand-slogan {
      font-size: 18px;
      color: $c-ink-muted;
    }
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 18px;

    .nav-web-link {
      background: transparent;
      border: none;
      color: $c-ink-muted;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 8px;
      transition: color 0.2s ease;

      &:hover {
        color: $c-ink-red;
      }
    }

    .nav-download-link {
      font-size: 15px;
      font-weight: 800;
      color: $c-ink-black;
      text-decoration: none;
      padding: 4px 12px;
      border-radius: 4px;
      transition: color 0.2s ease;

      &:hover {
        color: $c-ink-red;
      }
    }
  }
}

// ---------------- 主画布 ----------------
.zine-canvas {
  position: relative;
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 24px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

// 背景胶带与撕纸装饰
.decor-tape {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  opacity: 0.85;

  &--top-left {
    top: 8px;
    left: 18px;
    width: 110px;
    transform: rotate(-14deg);
  }

  &--mid-left {
    top: 380px;
    left: -20px;
    width: 130px;
    transform: rotate(35deg);
  }
}

.decor-torn-patch {
  position: absolute;
  pointer-events: none;
  z-index: 0;

  &--left {
    top: 140px;
    left: -30px;
    width: 120px;
    height: 240px;
    background: #cbb493;
    clip-path: polygon(0 0, 100% 12%, 85% 48%, 95% 82%, 10% 100%, 0 90%);
    opacity: 0.6;
  }
}

// 三栏主舞台网格
.canvas-grid-stage {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.25fr 1fr 1.05fr;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 36px;
  }
}

// ---------------- 1. 左侧方格手账核心便签卡片 ----------------
.zine-main-card {
  position: relative;
  background-color: $c-grid-paper;
  background-image:
    linear-gradient($c-grid-line 1px, transparent 1px),
    linear-gradient(90deg, $c-grid-line 1px, transparent 1px);
  background-size: 20px 20px;
  border-radius: 4px;
  padding: 32px 28px 24px;
  box-shadow:
    6px 12px 24px rgb(58 36 24 / 14%),
    1px 2px 4px rgb(58 36 24 / 8%);
  transform: rotate(-1.5deg);
  transition: transform 0.3s ease;

  &:hover {
    transform: rotate(-0.5deg);
  }

  .card-tape-label {
    display: inline-block;
    background: $c-tape-yellow;
    border: 1px dashed $c-tape-border;
    color: #4a3424;
    font-size: 13px;
    font-weight: 800;
    padding: 4px 14px;
    border-radius: 2px;
    margin-bottom: 16px;
    box-shadow: 1px 2px 3px rgb(0 0 0 / 8%);
  }

  .card-hero-title {
    margin: 0 0 14px;
    font-size: clamp(34px, 4vw, 46px);
    font-weight: 900;
    line-height: 1.15;
    color: $c-ink-black;

    .brush-brand {
      color: $c-ink-red;
      display: inline-block;
      margin: 0 4px;
      font-size: 1.1em;
      transform: rotate(-2deg);
    }
  }

  .card-hero-desc {
    margin: 0 0 24px;
    font-size: 15px;
    line-height: 1.6;
    color: $c-ink-muted;
    font-weight: 500;
  }

  .card-action-flex {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;

    @media (max-width: 520px) {
      flex-direction: column;
    }
  }

  .action-btn-col {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .zine-primary-download-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 22px;
      background: $c-ink-red;
      color: #fff;
      font-size: 17px;
      font-weight: 800;
      text-decoration: none;
      border-radius: 12px;
      box-shadow:
        0 6px 14px rgb(201 52 30 / 36%),
        0 3px 0 #8b1806;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        background: $c-ink-red-strong;
        transform: translateY(-2px);
        box-shadow:
          0 10px 20px rgb(201 52 30 / 46%),
          0 5px 0 #8b1806;
      }

      &:active {
        transform: translateY(2px);
        box-shadow:
          0 2px 6px rgb(201 52 30 / 30%),
          0 1px 0 #8b1806;
      }

      .android-svg-icon {
        display: flex;
        align-items: center;
      }
    }

    .install-guide-link {
      background: transparent;
      border: none;
      color: #214358;
      font-size: 16px;
      font-weight: bold;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      text-align: left;
      transition: color 0.2s ease;

      &:hover {
        color: $c-ink-red;
      }
    }
  }

  .card-features-note {
    display: flex;
    align-items: center;
    gap: 10px;

    .handwrite-bullet-list {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 17px;
      color: #3b281d;
      line-height: 1.55;
    }

    .handwrite-smile {
      margin-left: 4px;
      opacity: 0.85;
    }
  }

  .mood-stamp-badge {
    position: absolute;
    bottom: -16px;
    left: -12px;
    border: 2px solid $c-ink-black;
    padding: 6px 8px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.5px;
    line-height: 1.15;
    background: #fdfbf7;
    transform: rotate(-10deg);
    box-shadow: 2px 3px 0 rgb(58 36 24 / 20%);
    pointer-events: none;

    .stamp-line {
      display: block;
    }
  }
}

// ---------------- 2. 中间：高拟真圆角手机 App 呈现 ----------------
.zine-device-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 5;

  .device-phone-body {
    width: 290px;
    background: #111;
    border: 8px solid #222;
    border-radius: 40px;
    box-shadow:
      0 18px 36px rgb(58 36 24 / 28%),
      0 0 0 1px rgb(255 255 255 / 15%);
    overflow: hidden;
    transform: rotate(2deg);
    transition: transform 0.4s ease;

    &:hover {
      transform: rotate(0deg) scale(1.02);
    }
  }

  .phone-screen-display {
    background: #f7f5ef;
    padding: 10px 12px 14px;
    min-height: 490px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #333;
    font-size: 11px;
  }

  .screen-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    font-weight: 700;
    color: #444;
    padding: 0 4px;

    .status-speaker-notch {
      width: 44px;
      height: 4px;
      background: #000;
      border-radius: 3px;
    }
  }

  .app-view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;

    .avatar-dish-img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #c9341e;
    }

    .app-brand-center {
      text-align: center;

      .app-logo-text {
        font-size: 18px;
        color: $c-ink-red;
        font-weight: 900;
        display: block;
        line-height: 1;
      }

      .app-slogan-text {
        font-size: 8px;
        color: #777;
        letter-spacing: 0.5px;
      }
    }

    .app-header-bell {
      font-size: 14px;
    }
  }

  .app-search-box {
    background: #fff;
    border: 1px solid #e2dacd;
    border-radius: 20px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #999;
    font-size: 10px;
  }

  .app-quick-icons {
    display: flex;
    justify-content: space-around;
    padding: 4px 0;

    .quick-icon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-weight: 700;
      color: #555;

      .icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;

        &--red {
          background: #ffebe8;
        }

        &--yellow {
          background: #fff6db;
        }

        &--green {
          background: #eaf6ea;
        }

        &--blue {
          background: #ebf3f9;
        }
      }
    }
  }

  .app-canteen-section {
    background: #fff;
    border-radius: 10px;
    padding: 8px 10px;
    border: 1px solid #ebd9c4;

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;

      .section-title-bold {
        font-size: 12px;
        font-weight: 800;
        color: #222;
      }

      .section-more-link {
        font-size: 9px;
        color: #888;
      }
    }

    .canteen-mini-card {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;

      &:last-child {
        margin-bottom: 0;
      }

      .mini-dish-thumb {
        width: 42px;
        height: 42px;
        border-radius: 6px;
        object-fit: cover;
      }

      .mini-canteen-info {
        flex: 1;

        .canteen-name-row {
          display: flex;
          align-items: center;
          gap: 4px;

          .name {
            font-weight: 800;
            font-size: 11px;
          }

          .score {
            color: #d48b17;
            font-weight: 800;
            font-size: 10px;
          }

          .reviews {
            color: #999;
            font-size: 8px;
          }
        }

        .canteen-dist {
          font-size: 8px;
          color: #999;
          margin: 1px 0;
        }

        .canteen-tag-row {
          display: flex;
          gap: 4px;

          .mini-tag {
            font-size: 8px;
            color: #666;
            background: #f4eee3;
            padding: 1px 4px;
            border-radius: 3px;
          }
        }
      }
    }
  }

  .app-feed-section {
    background: #fff;
    border-radius: 10px;
    padding: 8px 10px;
    border: 1px solid #ebd9c4;

    .feed-header-row {
      margin-bottom: 4px;

      .section-title-bold {
        font-size: 12px;
        font-weight: 800;
        color: #222;
      }
    }

    .feed-user-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;

      .username {
        font-weight: 800;
        font-size: 10px;
      }

      .post-time {
        font-size: 8px;
        color: #999;
        margin-left: 4px;
      }
    }

    .feed-text {
      margin: 0 0 6px;
      font-size: 10px;
      color: #444;
      line-height: 1.35;
    }

    .feed-dish-image-wrapper {
      width: 100%;
      height: 80px;
      border-radius: 6px;
      overflow: hidden;

      .feed-dish-big-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
}

// ---------------- 3. 右侧手账拼贴组 ----------------
.zine-right-collage {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;

  // 黄色便签
  .yellow-sticky-note {
    position: relative;
    background: #f9f2d1;
    border: 1px solid #e5d79c;
    border-radius: 2px;
    padding: 18px 20px 14px;
    box-shadow:
      4px 8px 16px rgb(58 36 24 / 12%),
      0 1px 3px rgb(0 0 0 / 6%);
    transform: rotate(3deg);
    width: 190px;

    .sticky-tape-pin {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 50px;
      height: 16px;
      background: rgb(240 225 160 / 70%);
      border: 1px dashed rgb(200 180 120 / 60%);
    }

    .sticky-icon-android {
      margin-bottom: 4px;
    }

    .sticky-title {
      margin: 0 0 6px;
      font-size: 18px;
      font-weight: 900;
      color: $c-ink-black;
      font-family: sans-serif;
    }

    .sticky-slogan {
      margin: 0;
      font-size: 16px;
      line-height: 1.4;
      color: #4f3b2e;
    }
  }

  // 红色圆形印章
  .circular-red-stamp {
    position: absolute;
    top: 120px;
    right: 10px;
    width: 95px;
    height: 95px;
    transform: rotate(-12deg);
    pointer-events: none;
    opacity: 0.88;

    .svg-stamp {
      width: 100%;
      height: 100%;
    }
  }

  // 手绘涂鸦“好吃的总在校园里 :)” + 弯曲箭头
  .doodle-quote-arrow {
    position: absolute;
    top: -20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    pointer-events: none;

    .doodle-text {
      font-size: 19px;
      color: #2c4c64;
      font-weight: bold;
      line-height: 1.25;
      text-align: right;
    }

    .doodle-curved-arrow {
      width: 50px;
      height: 35px;
      transform: rotate(10deg);
    }
  }

  // 右下角钢笔速写插画
  .canteen-sketch-card {
    position: relative;
    width: 200px;
    margin-top: 10px;
    border-radius: 4px;
    overflow: hidden;
    mix-blend-mode: multiply;
    opacity: 0.9;
    transform: rotate(-1deg);

    .canteen-sketch-img {
      width: 100%;
      height: auto;
      display: block;
    }
  }
}

// ---------------- 4. 底部横贯的大撕纸横幅 ----------------
.bottom-torn-banner {
  position: relative;
  z-index: 10;
  margin-top: 10px;
  background-color: #faf5eb;
  background-image: repeating-linear-gradient(
    transparent,
    transparent 27px,
    rgb(58 36 24 / 7%) 27px,
    rgb(58 36 24 / 7%) 28px
  );
  border: 1px dashed rgb(58 36 24 / 20%);
  border-radius: 4px;
  padding: 16px 36px 14px;
  box-shadow:
    0 10px 24px rgb(58 36 24 / 14%),
    0 2px 4px rgb(0 0 0 / 6%);
  transform: rotate(-0.6deg);

  // 回形针
  .paper-clip-decor {
    position: absolute;
    top: -18px;
    left: 28px;
    width: 28px;
    height: auto;
    z-index: 12;
    transform: rotate(-8deg);
    filter: drop-shadow(2px 4px 4px rgb(0 0 0 / 30%));
  }

  .banner-content-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }

  .banner-handwrite-text {
    margin: 0;
    font-size: clamp(24px, 3.2vw, 36px);
    font-weight: 900;
    color: $c-ink-black;
    line-height: 1.35;
    letter-spacing: 0.5px;

    .mobile-break {
      display: none;

      @media (max-width: 768px) {
        display: block;
      }
    }

    .highlight-ink-underlined {
      position: relative;
      display: inline-block;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: 2px;
        width: 100%;
        height: 6px;
        background: rgb(201 52 30 / 65%);
        border-radius: 3px;
        z-index: -1;
        transform: rotate(-0.5deg);
      }
    }
  }

  // 右侧小方折角便签
  .banner-sticky-subnote {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #fff;
    border: 1px solid #ebdccb;
    border-radius: 3px;
    padding: 8px 14px;
    box-shadow: 2px 4px 8px rgb(58 36 24 / 10%);
    transform: rotate(2deg);

    .subnote-text {
      margin: 0;
      font-size: 15px;
      color: $c-ink-red;
      font-weight: 900;
      line-height: 1.25;
      text-align: right;
    }
  }
}

// ---------------- 安装说明折叠弹窗 ----------------
.guide-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgb(58 36 24 / 45%);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.guide-modal-paper {
  position: relative;
  background: #fffdf8;
  border: 2px solid $c-ink-black;
  border-radius: 6px;
  max-width: 480px;
  width: 100%;
  padding: 32px 28px 24px;
  box-shadow: 8px 16px 32px rgb(0 0 0 / 25%);
  transform: rotate(-0.8deg);

  .guide-tape-decor {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 22px;
    background: rgb(242 226 168 / 85%);
    border: 1px dashed rgb(200 180 120 / 60%);
  }

  .guide-modal-title {
    margin: 0 0 16px;
    font-size: 26px;
    color: $c-ink-black;
    font-weight: 900;
    text-align: center;
  }

  .guide-steps-list {
    margin: 0 0 24px;
    padding-left: 20px;
    font-size: 15px;
    line-height: 1.7;
    color: #4a382c;

    code {
      background: #f0e6d6;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
      color: $c-ink-red;
    }
  }

  .guide-modal-actions {
    display: flex;
    justify-content: center;

    .guide-close-btn {
      padding: 10px 24px;
      background: $c-ink-red;
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 10px rgb(201 52 30 / 30%);
      transition: background 0.2s ease;

      &:hover {
        background: $c-ink-red-strong;
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
  border: 2px solid $c-ink-black;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 4px 6px 0 rgb(58 36 24 / 20%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 360px;

  .toast-stamp-badge {
    background: $c-ink-red;
    color: #fff;
    font-size: 11px;
    font-weight: 900;
    padding: 3px 6px;
    border-radius: 3px;
    transform: rotate(-3deg);
  }

  .toast-text-wrap {
    flex: 1;

    .toast-head {
      font-size: 13px;
      font-weight: 800;
      color: $c-ink-black;
    }

    .toast-sub {
      font-size: 11px;
      color: $c-ink-muted;
      line-height: 1.35;
    }
  }

  .toast-x-btn {
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 14px;

    &:hover {
      color: $c-ink-black;
    }
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active,
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to,
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
