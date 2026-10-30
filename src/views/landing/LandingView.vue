<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  APK_DOWNLOAD_URL,
  APK_FILE_NAME,
  APK_SIZE,
  APK_VERSION,
  APK_TARGET_OS,
  APK_UPDATE_TIME,
} from '@/constants/download.js';

const router = useRouter();
const auth = useAuthStore();

// 专线站点数据（融入交大食堂与轨道交通隐喻）
const STATIONS = [
  {
    id: 'xueyuan',
    code: 'S01',
    name: '学苑大厦站',
    line: '豪华风味主干线',
    desc: '二层麻辣香锅、三层烤肉拌饭，晚上宵夜小炒聚会首选站点。',
    tag: '宵夜聚餐 · 强推二层',
    canteenId: 'canteen-xueyuan',
    signatureDish: '铁板黑椒牛柳 / 自选香锅',
    rating: '4.8',
  },
  {
    id: 'canteen1',
    code: 'S02',
    name: '第一食堂站',
    line: '晨夕经典总站',
    desc: '传统早餐油条豆浆、午间大荤自选，高性价比的老牌食堂标杆。',
    tag: '经典早餐 · 性价比之王',
    canteenId: 'canteen-1',
    signatureDish: '现炸油条豆腐脑 / 红烧狮子头',
    rating: '4.6',
  },
  {
    id: 'xuehuo',
    code: 'S03',
    name: '学活二食堂站',
    line: '人气沸腾环线',
    desc: '毗邻学生活动中心，下课高峰排队王，瓦罐靓汤与川味档口齐聚。',
    tag: '下课必冲 · 瓦罐原汤',
    canteenId: 'canteen-2',
    signatureDish: '茶树菇老鸭瓦罐汤 / 重庆小面',
    rating: '4.7',
  },
  {
    id: 'canteen3',
    code: 'S04',
    name: '第三食堂站',
    line: '温暖家常支线',
    desc: '冬日砂锅米线、热气水饺与黄焖鸡，抚慰赶DDL疲惫身心的深夜食堂。',
    tag: '暖心暖胃 · 砂锅小吃',
    canteenId: 'canteen-3',
    signatureDish: '热腾肥牛砂锅 / 手工水饺',
    rating: '4.7',
  },
  {
    id: 'east',
    code: 'S05',
    name: '东校区食堂站',
    line: '跨区直达专列',
    desc: '东区同学的美味大本营，菜品精选、环境宽敞，远离喧闹。',
    tag: '东区专属 · 静享美味',
    canteenId: 'canteen-dongqu',
    signatureDish: '特色照烧鸡腿饭 / 卤味双拼',
    rating: '4.5',
  },
];

const activeStationIndex = ref(0);
const activeStation = computed(() => STATIONS[activeStationIndex.value]);

function selectStation(index) {
  activeStationIndex.value = index;
}

// 常见问题折叠状态
const faqList = ref([
  {
    q: '安装时提示“未知来源应用”如何处理？',
    a: '这是安卓系统对非自带应用商店 APK 的常规安全提醒。请放心点击【设置/继续安装】，并勾选【允许来自此来源的应用】即可顺利完成安装。本应用纯净无广告，代码开源透明。',
    open: true,
  },
  {
    q: '支持鸿蒙 (HarmonyOS) 或平板设备吗？',
    a: '全面支持！支持鸿蒙 2.0 / 3.0 / 4.0 及以上版本系统，同时兼容主流 Android 8.0 至 Android 15 手机与平板设备。',
    open: false,
  },
  {
    q: '在校外可以访问和使用吗？',
    a: '完全可以！客户端直接连接云端服务，无需校园内网或 VPN，只要手机连接互联网即可随时随地查食堂、写食记、看推荐。',
    open: false,
  },
  {
    q: 'Web 网页版和安卓客户端有什么区别？',
    a: '安卓客户端针对手机端操作深度优化，具备离线菜单缓存、弱网秒开、开饭提醒、拍照直接发食记等专属特性，是北交干饭人的随身利器！',
    open: false,
  },
]);

function toggleFaq(index) {
  faqList.value[index].open = !faqList.value[index].open;
}

// 下载动作与反馈
const showDownloadToast = ref(false);
let toastTimer = null;

function handleDownloadTrigger() {
  showDownloadToast.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    showDownloadToast.value = false;
  }, 4500);
}

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
  <div class="landing-page">
    <!-- 顶部导航栏 -->
    <header class="landing-nav" role="banner">
      <div class="landing-nav__inner">
        <div class="landing-nav__brand">
          <span class="brand-stamp" aria-hidden="true">BJTU</span>
          <div class="brand-text">
            <h1 class="brand-title">北交干饭吧</h1>
            <span class="brand-subtitle">交大干饭专线 · 掌上客户端</span>
          </div>
        </div>

        <nav class="landing-nav__links" aria-label="官网导航">
          <a href="#hero" class="nav-item">专线进站</a>
          <a href="#stations" class="nav-item">全校站点</a>
          <a href="#features" class="nav-item">核心亮点</a>
          <a href="#guide" class="nav-item">安装指南</a>
        </nav>

        <div class="landing-nav__actions">
          <button
            type="button"
            class="nav-btn nav-btn--web"
            data-testid="enter-web-btn"
            @click="goToWeb"
          >
            {{ auth.isAuthenticated ? '进入网页版首页' : '网页版登录' }}
          </button>
          <a
            :href="APK_DOWNLOAD_URL"
            :download="APK_FILE_NAME"
            class="nav-btn nav-btn--cta"
            data-testid="nav-download-btn"
            @click="handleDownloadTrigger"
          >
            <span class="nav-cta-icon" aria-hidden="true">📥</span>
            <span>下载安卓版</span>
          </a>
        </div>
      </div>
    </header>

    <!-- 顶部广播/发车信息栏（交通隐喻） -->
    <div class="transit-ticker" aria-live="polite">
      <div class="transit-ticker__inner">
        <span class="ticker-badge">🚆 专线广播</span>
        <span class="ticker-text">
          交大干饭专线 2026
          次特快列车已进站！全校食堂档口实时热度、每日招牌与避雷食记一手掌握。
        </span>
        <span class="ticker-tag">版本 {{ APK_VERSION }} 最新发布</span>
      </div>
    </div>

    <!-- 首屏 Hero 区域 -->
    <section id="hero" class="hero-section" aria-labelledby="hero-title">
      <div class="hero-container">
        <!-- 左侧文本与下载 CTA -->
        <div class="hero-content">
          <div class="hero-badges">
            <span class="badge badge--stamp">交大干饭专线 · 始发站</span>
            <span class="badge badge--shine">Android 客户端官方首发</span>
          </div>

          <h2 id="hero-title" class="hero-heading">
            翻开手账，<br />
            <span class="highlight-ink">全校食堂</span>即刻进站！
          </h2>

          <p class="hero-lead">
            这不是普通的餐饮应用，而是北交同学共同书写的校园掌上美食手账。
            从学苑铁板到一食堂早餐，从避峰排队到档口真实打分，
            让每一次走进食堂，都吃得明白、吃得痛快！
          </p>

          <!-- 核心下载大按钮 CTA -->
          <div class="hero-cta-card">
            <div class="hero-cta-main">
              <a
                :href="APK_DOWNLOAD_URL"
                :download="APK_FILE_NAME"
                class="download-btn-hero"
                data-testid="hero-download-btn"
                @click="handleDownloadTrigger"
              >
                <div class="btn-icon-wrapper" aria-hidden="true">
                  <svg
                    class="btn-svg-icon"
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
                <div class="btn-text-wrapper">
                  <span class="btn-action-title">下载安卓安装包</span>
                  <span class="btn-action-sub"
                    >{{ APK_FILE_NAME }} · {{ APK_SIZE }}</span
                  >
                </div>
                <span class="btn-shimmer" aria-hidden="true"></span>
              </a>

              <button
                type="button"
                class="hero-web-entry-btn"
                data-testid="hero-web-btn"
                @click="goToWeb"
              >
                <span>网页版在线浏览 →</span>
              </button>
            </div>

            <div class="hero-cta-meta">
              <div class="meta-item">
                <span class="meta-dot"></span>
                <span>支持系统：{{ APK_TARGET_OS }} / 鸿蒙</span>
              </div>
              <div class="meta-item">
                <span class="meta-dot"></span>
                <span>更新日期：{{ APK_UPDATE_TIME }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-dot"></span>
                <span>包体大小：约 {{ APK_SIZE }}（超轻量）</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧拟物手机展示与模拟器 -->
        <div class="hero-visual">
          <div class="phone-mockup" aria-hidden="true">
            <div class="phone-frame">
              <div class="phone-speaker"></div>
              <div class="phone-camera"></div>

              <!-- 手机屏幕内容 -->
              <div class="phone-screen">
                <div class="screen-status-bar">
                  <span>12:00</span>
                  <span class="status-right">📶 5G 🔋 100%</span>
                </div>

                <div class="screen-app-header">
                  <span class="screen-badge">北交干饭专线</span>
                  <h4 class="screen-title">今日推荐 · 学苑站</h4>
                </div>

                <div class="screen-dish-card">
                  <div class="dish-tag">今日热榜 No.1</div>
                  <div class="dish-name">铁板黑椒牛柳套餐</div>
                  <div class="dish-price-rating">
                    <span class="price">￥16.5</span>
                    <span class="rating">★ 4.9 (428条点评)</span>
                  </div>
                  <div class="dish-crowd">
                    <span class="crowd-indicator crowd-indicator--green"></span>
                    <span>当前窗口排队适中（约 4 分钟）</span>
                  </div>
                </div>

                <div class="screen-transit-preview">
                  <div class="transit-line-header">
                    <span>专线列车正开往：一食堂站</span>
                    <span class="transit-blink">● 准点运行</span>
                  </div>
                  <div class="mini-station-dots">
                    <span class="dot active"></span>
                    <span class="line active"></span>
                    <span class="dot active"></span>
                    <span class="line"></span>
                    <span class="dot"></span>
                    <span class="line"></span>
                    <span class="dot"></span>
                  </div>
                </div>

                <div class="screen-post-snippet">
                  <div class="user-row">
                    <span class="avatar">🍱</span>
                    <span class="name">机械楼干饭先锋</span>
                    <span class="time">10分钟前</span>
                  </div>
                  <p class="comment">
                    “学苑二层香锅今天加肉量超大，阿姨打菜手不抖，冲！”
                  </p>
                </div>
              </div>
            </div>

            <!-- 手机背后的立体发车车票与徽标装饰 -->
            <div class="ticket-card ticket-card--decor">
              <div class="ticket-header">
                <span>BJTU EXPRESS</span>
                <span>特快乘车凭证</span>
              </div>
              <div class="ticket-body">
                <div class="ticket-from-to">
                  <div>
                    <span class="city">交大主区</span>
                    <span class="code">STA-01</span>
                  </div>
                  <div class="train-arrow">➔ 2026 ➔</div>
                  <div>
                    <span class="city">美味食堂</span>
                    <span class="code">DEST</span>
                  </div>
                </div>
                <div class="ticket-footer">
                  <span>凭此票畅吃全校</span>
                  <span class="stamp-verified">干饭必达</span>
                </div>
              </div>
            </div>

            <!-- 浮动扫码下载小卡片 -->
            <div class="qr-float-card" data-testid="qr-float-card">
              <div class="qr-box">
                <!-- SVG 二维码仿真图谱 -->
                <svg
                  class="qr-svg"
                  viewBox="0 0 100 100"
                  aria-label="安卓端下载二维码"
                >
                  <rect width="100" height="100" fill="#fff" rx="4" />
                  <!-- 码眼左上 -->
                  <rect x="8" y="8" width="24" height="24" fill="#3a2418" />
                  <rect x="12" y="12" width="16" height="16" fill="#fff" />
                  <rect x="16" y="16" width="8" height="8" fill="#c9341e" />
                  <!-- 码眼右上 -->
                  <rect x="68" y="8" width="24" height="24" fill="#3a2418" />
                  <rect x="72" y="12" width="16" height="16" fill="#fff" />
                  <rect x="76" y="16" width="8" height="8" fill="#c9341e" />
                  <!-- 码眼左下 -->
                  <rect x="8" y="68" width="24" height="24" fill="#3a2418" />
                  <rect x="12" y="72" width="16" height="16" fill="#fff" />
                  <rect x="16" y="76" width="8" height="8" fill="#c9341e" />
                  <!-- 模拟数据块散布 -->
                  <rect x="40" y="10" width="8" height="8" fill="#3a2418" />
                  <rect x="52" y="14" width="6" height="6" fill="#3a2418" />
                  <rect x="36" y="24" width="12" height="6" fill="#3a2418" />
                  <rect x="12" y="40" width="6" height="12" fill="#3a2418" />
                  <rect x="24" y="44" width="8" height="8" fill="#3a2418" />
                  <rect x="40" y="40" width="20" height="20" fill="#c9341e" />
                  <text
                    x="50"
                    y="54"
                    font-size="10"
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
              <div class="qr-info">
                <span class="qr-title">手机扫码直接下</span>
                <span class="qr-desc">安卓手机扫码立即下载</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 专线站点与轨道交互导览 (Transit Stations Section) -->
    <section
      id="stations"
      class="stations-section"
      aria-labelledby="stations-title"
    >
      <div class="section-container">
        <div class="section-header">
          <div class="section-tag-row">
            <span class="rail-tag">线路隐喻 · 轨道导览</span>
            <span class="rail-indicator">● 全线绿灯正常通车</span>
          </div>
          <h3 id="stations-title" class="section-main-title">
            交大干饭专线 · 校园站点图谱
          </h3>
          <p class="section-lead-desc">
            把北交食堂串联成一条随时发车的美味轻轨。点击任意车站，提前打卡招牌与避雷攻略。
          </p>
        </div>

        <!-- 轨道线路站点轴 -->
        <div class="transit-line-axis" role="tablist" aria-label="食堂站点切换">
          <button
            v-for="(st, idx) in STATIONS"
            :key="st.id"
            role="tab"
            :aria-selected="activeStationIndex === idx"
            class="station-node"
            :class="{ 'is-active': activeStationIndex === idx }"
            @click="selectStation(idx)"
          >
            <span class="station-node__code">{{ st.code }}</span>
            <span class="station-node__dot"></span>
            <span class="station-node__name">{{ st.name }}</span>
          </button>
        </div>

        <!-- 激活站点详情卡片 -->
        <div class="station-detail-panel">
          <div class="panel-left">
            <div class="panel-badge-row">
              <span class="station-badge">{{ activeStation.code }}</span>
              <span class="station-line-name">{{ activeStation.line }}</span>
              <span class="station-score"
                >评分 ★ {{ activeStation.rating }}</span
              >
            </div>
            <h4 class="station-heading">{{ activeStation.name }}</h4>
            <p class="station-desc">{{ activeStation.desc }}</p>
            <div class="station-signature">
              <span class="sig-label">推荐招牌：</span>
              <span class="sig-val">{{ activeStation.signatureDish }}</span>
            </div>
            <div class="station-tag-pill">
              <span>🏷️ {{ activeStation.tag }}</span>
            </div>
          </div>

          <div class="panel-right">
            <div class="panel-action-card">
              <div class="action-card-header">
                <span class="action-train-icon">🚆</span>
                <div>
                  <div class="action-card-title">前往该站干饭</div>
                  <div class="action-card-sub">下载安卓版获取实时排队更新</div>
                </div>
              </div>
              <a
                :href="APK_DOWNLOAD_URL"
                :download="APK_FILE_NAME"
                class="station-download-btn"
                @click="handleDownloadTrigger"
              >
                📥 立即下载 APK 锁定美味
              </a>
              <button type="button" class="station-web-link" @click="goToWeb">
                在网页版中浏览食堂 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 核心功能亮点 (Bento Grid Features) -->
    <section
      id="features"
      class="features-section"
      aria-labelledby="features-title"
    >
      <div class="section-container">
        <div class="section-header">
          <span class="rail-tag">专属特性 · WHY ANDROID APP</span>
          <h3 id="features-title" class="section-main-title">
            为什么你的手机里需要「北交干饭吧」？
          </h3>
          <p class="section-lead-desc">
            拒绝盲盒踩雷，让每天中午下课后的 12
            点不再陷入“今天吃什么”的世纪难题。
          </p>
        </div>

        <div class="features-grid">
          <!-- 卡片 1 -->
          <div class="feature-card feature-card--featured">
            <div class="card-icon-box">📶</div>
            <span class="card-step-tag">离线快开</span>
            <h4 class="card-title">弱网毫秒级直达，人多也不卡</h4>
            <p class="card-desc">
              正午饭点食堂信号总是断断续续？安卓客户端具备智能离线缓存，菜谱、档口位置与高赞点评秒级展开，无需在窗口前尴尬刷新。
            </p>
            <div class="card-decor-line"></div>
          </div>

          <!-- 卡片 2 -->
          <div class="feature-card">
            <div class="card-icon-box">📢</div>
            <span class="card-step-tag">站点报站</span>
            <h4 class="card-title">食堂避峰排队与开饭推送</h4>
            <p class="card-desc">
              实时知悉热门档口出餐节奏，瓦罐汤热腾出炉、烤鸭新鲜上架第一时间提醒，避开汹涌人流轻松打卡。
            </p>
          </div>

          <!-- 卡片 3 -->
          <div class="feature-card">
            <div class="card-icon-box">📝</div>
            <span class="card-step-tag">手账记录</span>
            <h4 class="card-title">随手拍食记，定制校园印章</h4>
            <p class="card-desc">
              吃完随手拍照记录，自动盖上交大食堂专属印章、撕纸纹理与评分贴纸。是你的个人味蕾档案，也是同窗的避坑指南。
            </p>
          </div>

          <!-- 卡片 4 -->
          <div class="feature-card">
            <div class="card-icon-box">🛡️</div>
            <span class="card-step-tag">纯净开源</span>
            <h4 class="card-title">学生自研，无广告极轻体量</h4>
            <p class="card-desc">
              仅 20.7 MB
              超小包体，没有商业软件的烦人开屏广告与隐私追踪，代码完全公开，纯粹为交大干饭人服务。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 安装使用指引与常见问题 (Guide & FAQ) -->
    <section id="guide" class="guide-section" aria-labelledby="guide-title">
      <div class="section-container">
        <div class="section-header">
          <span class="rail-tag">简易上手 · 3 步开饭</span>
          <h3 id="guide-title" class="section-main-title">
            安卓安装包安装简明指南
          </h3>
          <p class="section-lead-desc">
            免通过第三方应用市场，30 秒即可轻松装入手机。
          </p>
        </div>

        <!-- 3步流程卡 -->
        <div class="steps-row">
          <div class="step-card">
            <div class="step-number">01</div>
            <h4 class="step-title">点击下载安装包</h4>
            <p class="step-desc">
              点击页面上的主按钮，获取官方原生构建的 {{ APK_FILE_NAME }} ({{
                APK_SIZE
              }}) 文件。
            </p>
          </div>
          <div class="step-arrow" aria-hidden="true">➔</div>
          <div class="step-card">
            <div class="step-number">02</div>
            <h4 class="step-title">允许从外部安装</h4>
            <p class="step-desc">
              系统弹出“未知来源应用”安全警示时，点击【允许/继续安装】即可，无任何安全风险。
            </p>
          </div>
          <div class="step-arrow" aria-hidden="true">➔</div>
          <div class="step-card">
            <div class="step-number">03</div>
            <h4 class="step-title">打开即可干饭</h4>
            <p class="step-desc">
              安装完成后在桌面点击图标打开，即刻开启全校各食堂的美味探索旅程！
            </p>
          </div>
        </div>

        <!-- FAQ 折叠问答 -->
        <div class="faq-container">
          <h4 class="faq-header-title">常见安装与使用问题</h4>
          <div class="faq-list">
            <div
              v-for="(faq, fIdx) in faqList"
              :key="fIdx"
              class="faq-item"
              :class="{ 'is-open': faq.open }"
            >
              <button
                type="button"
                class="faq-question"
                :aria-expanded="faq.open"
                @click="toggleFaq(fIdx)"
              >
                <span class="faq-q-text">{{ faq.q }}</span>
                <span class="faq-toggle-icon">{{ faq.open ? '−' : '+' }}</span>
              </button>
              <div v-show="faq.open" class="faq-answer">
                <p>{{ faq.a }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部超大召唤区域 (Bottom CTA Station Banner) -->
    <section class="bottom-cta-section" aria-labelledby="cta-bottom-title">
      <div class="bottom-cta-box">
        <div class="bottom-cta-content">
          <span class="bottom-station-sign">终点站：美味集结</span>
          <h3 id="cta-bottom-title" class="bottom-cta-heading">
            下一班干饭专线即将发车，<br />
            马上下载安卓客户端！
          </h3>
          <p class="bottom-cta-sub">
            无需繁琐设置，即刻加入北交吃货大家庭，给每一次进餐多一份期待。
          </p>

          <div class="bottom-cta-actions">
            <a
              :href="APK_DOWNLOAD_URL"
              :download="APK_FILE_NAME"
              class="bottom-download-btn"
              data-testid="bottom-download-btn"
              @click="handleDownloadTrigger"
            >
              <span class="bottom-btn-icon" aria-hidden="true">📥</span>
              <div class="bottom-btn-labels">
                <span class="main-label">立即下载安卓安装包</span>
                <span class="sub-label"
                  >{{ APK_FILE_NAME }} · {{ APK_SIZE }}</span
                >
              </div>
            </a>

            <button type="button" class="bottom-web-btn" @click="goToWeb">
              进入网页版 →
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 官网页脚 -->
    <footer class="landing-footer">
      <div class="landing-footer__inner">
        <div class="footer-left">
          <p class="footer-logo">北交干饭吧 / BJTU FOODTIME</p>
          <p class="footer-slogan">一页一餐的校园美食手账 · 干饭专线特快直达</p>
          <p class="footer-meta">
            2026 · 由北京交通大学爱吃饭的同学开源维护 · 纯净无广告
          </p>
        </div>
        <div class="footer-right">
          <a
            :href="APK_DOWNLOAD_URL"
            :download="APK_FILE_NAME"
            class="footer-link"
          >
            下载 APK ({{ APK_VERSION }})
          </a>
          <button type="button" class="footer-link-btn" @click="goToWeb">
            网页端登录
          </button>
          <a href="#hero" class="footer-link">返回顶部 ↑</a>
        </div>
      </div>
    </footer>

    <!-- 下载触发提示浮窗 Toast -->
    <transition name="toast-fade">
      <div
        v-if="showDownloadToast"
        class="download-toast"
        role="status"
        aria-live="polite"
        data-testid="download-toast"
      >
        <span class="toast-icon">🚀</span>
        <div class="toast-body">
          <div class="toast-title">正在开始下载安卓安装包！</div>
          <div class="toast-desc">
            文件名：{{ APK_FILE_NAME }} ({{
              APK_SIZE
            }})，请在浏览器的下载栏查看。
          </div>
        </div>
        <button
          type="button"
          class="toast-close"
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
// 设计令牌与色彩系统复用
$c-bg: #f5f2e9;
$c-bg-card: #fffdf9;
$c-primary: #c9341e;
$c-primary-hover: #b02713;
$c-secondary: #3a2418;
$c-accent-green: #2e6b48;
$c-rail-blue: #23527c;
$c-text: #3a2418;
$c-text-muted: #6e584a;
$c-border: #dcd3c3;

.landing-page {
  position: relative;
  min-height: 100vh;
  background-color: $c-bg;
  background-image:
    radial-gradient(circle at 10% 20%, rgb(201 52 30 / 3%) 0, transparent 40%),
    radial-gradient(circle at 90% 80%, rgb(35 82 124 / 4%) 0, transparent 40%);
  color: $c-text;
  font-family: var(
    --ft-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif
  );
  overflow-x: hidden;
}

// 顶部导航栏
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  background: rgb(245 242 233 / 92%);
  border-bottom: 1px solid rgb(58 36 24 / 12%);
  transition: all 0.3s ease;

  &__inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 12px;

    .brand-stamp {
      display: inline-block;
      padding: 4px 8px;
      background: $c-primary;
      color: #fff;
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 1px;
      border-radius: 4px;
      transform: rotate(-3deg);
      box-shadow: 2px 2px 0 rgb(58 36 24 / 30%);
    }

    .brand-title {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
      font-family: var(--ft-font-family-title, serif);
      color: $c-secondary;
      line-height: 1.2;
    }

    .brand-subtitle {
      font-size: 11px;
      color: $c-text-muted;
      letter-spacing: 0.5px;
    }
  }

  &__links {
    display: flex;
    align-items: center;
    gap: 24px;

    @media (max-width: 768px) {
      display: none;
    }

    .nav-item {
      color: $c-text-muted;
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      transition: color 0.2s ease;

      &:hover {
        color: $c-primary;
      }
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 999px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      &--web {
        background: transparent;
        color: $c-text;
        border: 1px solid rgb(58 36 24 / 25%);

        &:hover {
          background: rgb(58 36 24 / 6%);
          border-color: $c-secondary;
        }
      }

      &--cta {
        background: $c-primary;
        color: #fff;
        border: 1px solid $c-primary-hover;
        box-shadow: 0 4px 10px rgb(201 52 30 / 28%);

        &:hover {
          background: $c-primary-hover;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgb(201 52 30 / 35%);
        }
      }
    }
  }
}

// 广播条
.transit-ticker {
  background: $c-secondary;
  color: #fff;
  padding: 8px 16px;
  font-size: 13px;
  overflow: hidden;

  &__inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    .ticker-badge {
      font-weight: 700;
      color: #f7ca44;
      background: rgb(247 202 68 / 18%);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .ticker-text {
      flex: 1;
      min-width: 260px;
      color: #ede4d8;
    }

    .ticker-tag {
      font-size: 11px;
      color: #bbb;
      background: rgb(255 255 255 / 10%);
      padding: 2px 6px;
      border-radius: 3px;
    }
  }
}

// 通用容器
.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  max-width: 720px;
  margin: 0 auto 48px;

  .section-tag-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .rail-tag {
    display: inline-block;
    padding: 3px 10px;
    background: rgb(35 82 124 / 12%);
    color: $c-rail-blue;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    border-radius: 4px;
  }

  .rail-indicator {
    font-size: 12px;
    color: $c-accent-green;
    font-weight: 600;
  }

  .section-main-title {
    margin: 0 0 16px;
    font-size: clamp(28px, 4vw, 38px);
    font-weight: 900;
    font-family: var(--ft-font-family-title, serif);
    color: $c-secondary;
  }

  .section-lead-desc {
    margin: 0;
    font-size: 16px;
    color: $c-text-muted;
    line-height: 1.6;
  }
}

// ---------------- HERO 区域 ----------------
.hero-section {
  position: relative;
  padding: 60px 24px 80px;

  .hero-container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    align-items: center;
    gap: 48px;

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 40px;
    }
  }
}

.hero-content {
  .hero-badges {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;

    @media (max-width: 960px) {
      justify-content: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 4px;

      &--stamp {
        background: rgb(58 36 24 / 8%);
        color: $c-secondary;
        border: 1px dashed $c-secondary;
        transform: rotate(-1deg);
      }

      &--shine {
        background: rgb(201 52 30 / 12%);
        color: $c-primary;
        border: 1px solid rgb(201 52 30 / 25%);
      }
    }
  }

  .hero-heading {
    margin: 0 0 20px;
    font-size: clamp(34px, 5.5vw, 54px);
    font-weight: 900;
    line-height: 1.15;
    font-family: var(--ft-font-family-title, serif);
    color: $c-secondary;
    letter-spacing: -0.5px;

    .highlight-ink {
      color: $c-primary;
      position: relative;
      display: inline-block;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: 4px;
        width: 100%;
        height: 10px;
        background: rgb(247 202 68 / 35%);
        z-index: -1;
        border-radius: 4px;
      }
    }
  }

  .hero-lead {
    font-size: clamp(16px, 1.8vw, 18px);
    line-height: 1.7;
    color: $c-text-muted;
    margin: 0 0 32px;
    max-width: 600px;

    @media (max-width: 960px) {
      margin-left: auto;
      margin-right: auto;
    }
  }
}

// 核心下载卡片 CTA
.hero-cta-card {
  background: $c-bg-card;
  border: 2px solid $c-secondary;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 6px 8px 0 rgb(58 36 24 / 18%);
  max-width: 580px;

  @media (max-width: 960px) {
    margin: 0 auto;
    text-align: left;
  }

  .hero-cta-main {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;

    @media (max-width: 560px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .download-btn-hero {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 16px;
    padding: 14px 28px;
    background: linear-gradient(135deg, $c-primary 0%, #a9200c 100%);
    color: #fff;
    text-decoration: none;
    border-radius: 14px;
    border: 1px solid #921706;
    box-shadow: 0 8px 24px rgb(201 52 30 / 36%);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    flex: 1;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgb(201 52 30 / 46%);
      background: linear-gradient(135deg, #d33c24 0%, #b82510 100%);

      .btn-shimmer {
        transform: translateX(100%);
      }
    }

    &:active {
      transform: translateY(1px);
    }

    .btn-icon-wrapper {
      width: 40px;
      height: 40px;
      background: rgb(255 255 255 / 18%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .btn-svg-icon {
        width: 22px;
        height: 22px;
        stroke: #fff;
      }
    }

    .btn-text-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-start;

      .btn-action-title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.5px;
      }

      .btn-action-sub {
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

  .hero-web-entry-btn {
    padding: 14px 20px;
    background: transparent;
    color: $c-secondary;
    border: 1px dashed $c-secondary;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      background: rgb(58 36 24 / 6%);
      border-style: solid;
    }
  }

  .hero-cta-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    color: $c-text-muted;
    border-top: 1px dashed $c-border;
    padding-top: 14px;
    flex-wrap: wrap;

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      .meta-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: $c-accent-green;
      }
    }
  }
}

// ---------------- 视觉主体（手机模型 + 车票 + 扫码） ----------------
.hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;

  .phone-mockup {
    position: relative;
    width: 290px;
    perspective: 1000px;
    animation: floatPhone 6s ease-in-out infinite alternate;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  .phone-frame {
    position: relative;
    z-index: 2;
    background: #1e1e24;
    border: 10px solid #2a2a32;
    border-radius: 40px;
    box-shadow:
      0 24px 48px rgb(58 36 24 / 32%),
      inset 0 0 4px rgb(255 255 255 / 20%);
    overflow: hidden;
  }

  .phone-speaker {
    width: 60px;
    height: 5px;
    background: #3c3c46;
    border-radius: 3px;
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
  }

  .phone-camera {
    width: 8px;
    height: 8px;
    background: #252530;
    border-radius: 50%;
    position: absolute;
    top: 11px;
    left: calc(50% + 42px);
    z-index: 5;
  }

  .phone-screen {
    background: #faf7f0;
    padding: 28px 14px 18px;
    min-height: 480px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: $c-text;
  }

  .screen-status-bar {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 700;
    color: #777;
    padding: 0 4px;
  }

  .screen-app-header {
    background: #fff;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid #ebd9c2;
    box-shadow: 0 2px 4px rgb(0 0 0 / 4%);

    .screen-badge {
      font-size: 10px;
      font-weight: 800;
      color: #fff;
      background: $c-primary;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 4px;
    }

    .screen-title {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      color: $c-secondary;
    }
  }

  .screen-dish-card {
    background: #fff;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #ead6be;
    box-shadow: 0 3px 6px rgb(58 36 24 / 8%);

    .dish-tag {
      font-size: 10px;
      font-weight: 700;
      color: #c9341e;
      background: rgb(201 52 30 / 10%);
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 6px;
    }

    .dish-name {
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .dish-price-rating {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 8px;

      .price {
        color: $c-primary;
        font-weight: 900;
      }

      .rating {
        color: #d48b17;
        font-weight: 700;
      }
    }

    .dish-crowd {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: $c-accent-green;
      background: rgb(46 107 72 / 10%);
      padding: 4px 8px;
      border-radius: 6px;

      .crowd-indicator--green {
        width: 6px;
        height: 6px;
        background: $c-accent-green;
        border-radius: 50%;
      }
    }
  }

  .screen-transit-preview {
    background: #25394b;
    color: #fff;
    padding: 10px;
    border-radius: 10px;

    .transit-line-header {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 8px;

      .transit-blink {
        color: #4cd964;
      }
    }

    .mini-station-dots {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #5a738c;

        &.active {
          background: #f7ca44;
          box-shadow: 0 0 6px #f7ca44;
        }
      }

      .line {
        flex: 1;
        height: 2px;
        background: #5a738c;

        &.active {
          background: #f7ca44;
        }
      }
    }
  }

  .screen-post-snippet {
    background: #fff;
    padding: 10px;
    border-radius: 10px;
    font-size: 11px;
    border: 1px solid #ebd9c2;

    .user-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;

      .name {
        font-weight: 700;
      }

      .time {
        margin-left: auto;
        color: #999;
      }
    }

    .comment {
      margin: 0;
      color: #555;
      line-height: 1.4;
    }
  }

  // 车票装饰
  .ticket-card {
    position: absolute;
    top: -24px;
    left: -70px;
    width: 170px;
    background: #fffdf5;
    border: 1px dashed $c-secondary;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 4px 6px 0 rgb(58 36 24 / 14%);
    transform: rotate(-10deg);
    z-index: 1;

    @media (max-width: 560px) {
      display: none;
    }

    .ticket-header {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 800;
      color: $c-primary;
      border-bottom: 1px solid #eddcc6;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }

    .ticket-from-to {
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      margin-bottom: 6px;

      .city {
        font-size: 12px;
        font-weight: 900;
        display: block;
      }

      .code {
        font-size: 8px;
        color: #999;
      }

      .train-arrow {
        font-size: 9px;
        color: $c-primary;
        font-weight: bold;
      }
    }

    .ticket-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #666;

      .stamp-verified {
        color: $c-primary;
        border: 1px solid $c-primary;
        border-radius: 3px;
        padding: 1px 4px;
        font-weight: 800;
        font-size: 8px;
      }
    }
  }

  // 浮动扫码下载卡片
  .qr-float-card {
    position: absolute;
    bottom: -20px;
    right: -60px;
    background: #fff;
    border: 2px solid $c-secondary;
    border-radius: 12px;
    padding: 10px 14px;
    box-shadow: 4px 6px 0 rgb(58 36 24 / 20%);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 3;
    transform: rotate(3deg);
    transition: transform 0.2s ease;

    &:hover {
      transform: rotate(0deg) scale(1.05);
    }

    @media (max-width: 560px) {
      right: 0;
      bottom: -10px;
    }

    .qr-box {
      width: 58px;
      height: 58px;

      .qr-svg {
        width: 100%;
        height: 100%;
        display: block;
      }
    }

    .qr-info {
      display: flex;
      flex-direction: column;

      .qr-title {
        font-size: 13px;
        font-weight: 800;
        color: $c-secondary;
      }

      .qr-desc {
        font-size: 10px;
        color: $c-text-muted;
      }
    }
  }
}

@keyframes floatPhone {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  100% {
    transform: translateY(-12px) rotate(1deg);
  }
}

// ---------------- 站点图谱（交通轨道隐喻） ----------------
.stations-section {
  padding: 80px 24px;
  background: #ede9dc;
  border-top: 1px solid rgb(58 36 24 / 10%);
  border-bottom: 1px solid rgb(58 36 24 / 10%);
}

.transit-line-axis {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 36px;
  overflow-x: auto;
  padding: 12px 6px 20px;
  gap: 12px;

  &::before {
    content: '';
    position: absolute;
    top: 42px;
    left: 30px;
    right: 30px;
    height: 4px;
    background: #c3b9a5;
    z-index: 1;
  }

  .station-node {
    position: relative;
    z-index: 2;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 100px;
    outline: none;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-2px);
    }

    &__code {
      font-size: 11px;
      font-weight: 800;
      color: $c-text-muted;
      background: #dfd8c7;
      padding: 2px 8px;
      border-radius: 4px;
    }

    &__dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #faf7f0;
      border: 4px solid #a89a83;
      transition: all 0.2s ease;
    }

    &__name {
      font-size: 14px;
      font-weight: 700;
      color: $c-text;
      white-space: nowrap;
    }

    &.is-active {
      .station-node__code {
        background: $c-primary;
        color: #fff;
      }

      .station-node__dot {
        background: #fff;
        border-color: $c-primary;
        box-shadow: 0 0 0 4px rgb(201 52 30 / 25%);
        transform: scale(1.2);
      }

      .station-node__name {
        color: $c-primary;
        font-weight: 900;
      }
    }
  }
}

.station-detail-panel {
  background: $c-bg-card;
  border: 2px solid $c-secondary;
  border-radius: 16px;
  padding: 32px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
  box-shadow: 6px 8px 0 rgb(58 36 24 / 16%);

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .panel-left {
    .panel-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;

      .station-badge {
        background: $c-secondary;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 4px;
      }

      .station-line-name {
        font-size: 12px;
        font-weight: 700;
        color: $c-rail-blue;
      }

      .station-score {
        font-size: 12px;
        font-weight: 800;
        color: #d48b17;
      }
    }

    .station-heading {
      margin: 0 0 12px;
      font-size: 26px;
      font-weight: 900;
      font-family: var(--ft-font-family-title, serif);
      color: $c-secondary;
    }

    .station-desc {
      font-size: 15px;
      line-height: 1.6;
      color: $c-text-muted;
      margin: 0 0 20px;
    }

    .station-signature {
      background: rgb(58 36 24 / 4%);
      border-left: 4px solid $c-primary;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 14px;

      .sig-label {
        font-weight: 800;
        color: $c-secondary;
      }

      .sig-val {
        color: $c-primary;
        font-weight: 700;
      }
    }

    .station-tag-pill {
      font-size: 13px;
      color: $c-accent-green;
      font-weight: 600;
    }
  }

  .panel-right {
    display: flex;
    align-items: center;

    .panel-action-card {
      width: 100%;
      background: #faf6ec;
      border: 1px dashed $c-secondary;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      .action-card-header {
        display: flex;
        align-items: center;
        gap: 12px;

        .action-train-icon {
          font-size: 24px;
        }

        .action-card-title {
          font-weight: 800;
          font-size: 16px;
          color: $c-secondary;
        }

        .action-card-sub {
          font-size: 12px;
          color: $c-text-muted;
        }
      }

      .station-download-btn {
        display: block;
        text-align: center;
        padding: 12px 18px;
        background: $c-primary;
        color: #fff;
        text-decoration: none;
        border-radius: 10px;
        font-weight: 700;
        font-size: 14px;
        transition: all 0.2s ease;
        box-shadow: 0 4px 10px rgb(201 52 30 / 25%);

        &:hover {
          background: $c-primary-hover;
          transform: translateY(-1px);
        }
      }

      .station-web-link {
        background: transparent;
        border: none;
        color: $c-text-muted;
        font-size: 13px;
        cursor: pointer;
        padding: 4px;
        text-decoration: underline;

        &:hover {
          color: $c-primary;
        }
      }
    }
  }
}

// ---------------- 核心亮点 Bento Grid ----------------
.features-section {
  padding: 80px 24px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }

  .feature-card {
    background: $c-bg-card;
    border: 2px solid $c-secondary;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 4px 6px 0 rgb(58 36 24 / 14%);
    position: relative;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 6px 10px 0 rgb(58 36 24 / 20%);
    }

    &--featured {
      grid-column: span 2;

      @media (max-width: 960px) {
        grid-column: span 2;
      }

      @media (max-width: 600px) {
        grid-column: span 1;
      }
    }

    .card-icon-box {
      font-size: 32px;
      margin-bottom: 16px;
    }

    .card-step-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      color: $c-primary;
      background: rgb(201 52 30 / 10%);
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .card-title {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: 800;
      color: $c-secondary;
    }

    .card-desc {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: $c-text-muted;
    }
  }
}

// ---------------- 安装指南与 FAQ ----------------
.guide-section {
  padding: 80px 24px;
  background: #ede9dc;
}

.steps-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 56px;

  @media (max-width: 768px) {
    flex-direction: column;
  }

  .step-card {
    flex: 1;
    background: $c-bg-card;
    border: 2px solid $c-secondary;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 4px 6px 0 rgb(58 36 24 / 14%);
    text-align: center;
    width: 100%;

    .step-number {
      font-family: var(--ft-font-family-title, serif);
      font-size: 36px;
      font-weight: 900;
      color: $c-primary;
      margin-bottom: 8px;
    }

    .step-title {
      margin: 0 0 10px;
      font-size: 18px;
      font-weight: 800;
      color: $c-secondary;
    }

    .step-desc {
      margin: 0;
      font-size: 13px;
      color: $c-text-muted;
      line-height: 1.6;
    }
  }

  .step-arrow {
    font-size: 24px;
    color: $c-primary;
    font-weight: 900;

    @media (max-width: 768px) {
      transform: rotate(90deg);
      margin: -6px 0;
    }
  }
}

.faq-container {
  max-width: 800px;
  margin: 0 auto;
  background: $c-bg-card;
  border: 2px solid $c-secondary;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 6px 8px 0 rgb(58 36 24 / 16%);

  .faq-header-title {
    margin: 0 0 24px;
    font-size: 22px;
    font-weight: 900;
    color: $c-secondary;
    text-align: center;
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .faq-item {
    border: 1px solid $c-border;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.2s ease;

    &.is-open {
      border-color: $c-secondary;
    }

    .faq-question {
      width: 100%;
      background: transparent;
      border: none;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      font-weight: 700;
      color: $c-secondary;
      text-align: left;
      cursor: pointer;

      .faq-toggle-icon {
        font-size: 18px;
        color: $c-primary;
        font-weight: 800;
      }
    }

    .faq-answer {
      padding: 0 20px 16px;
      font-size: 14px;
      line-height: 1.6;
      color: $c-text-muted;

      p {
        margin: 0;
      }
    }
  }
}

// ---------------- 底部召唤区域 (Bottom CTA) ----------------
.bottom-cta-section {
  padding: 80px 24px 100px;

  .bottom-cta-box {
    max-width: 1000px;
    margin: 0 auto;
    background: linear-gradient(135deg, #3a2418 0%, #20130c 100%);
    color: #fff;
    border-radius: 24px;
    padding: 60px 40px;
    text-align: center;
    position: relative;
    box-shadow: 0 20px 40px rgb(58 36 24 / 30%);
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: -50px;
      right: -50px;
      width: 200px;
      height: 200px;
      background: radial-gradient(
        circle,
        rgb(201 52 30 / 30%) 0,
        transparent 70%
      );
      pointer-events: none;
    }
  }

  .bottom-station-sign {
    display: inline-block;
    padding: 4px 12px;
    background: rgb(247 202 68 / 15%);
    color: #f7ca44;
    border: 1px solid #f7ca44;
    font-size: 12px;
    font-weight: 800;
    border-radius: 4px;
    margin-bottom: 20px;
    letter-spacing: 1px;
  }

  .bottom-cta-heading {
    margin: 0 0 16px;
    font-size: clamp(28px, 4.5vw, 42px);
    font-weight: 900;
    font-family: var(--ft-font-family-title, serif);
    line-height: 1.25;
  }

  .bottom-cta-sub {
    font-size: 16px;
    color: #dfd4c7;
    margin: 0 auto 36px;
    max-width: 600px;
    line-height: 1.6;
  }

  .bottom-cta-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;

    .bottom-download-btn {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      background: $c-primary;
      color: #fff;
      padding: 16px 36px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 8px 24px rgb(201 52 30 / 45%);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        background: $c-primary-hover;
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgb(201 52 30 / 55%);
      }

      .bottom-btn-icon {
        font-size: 24px;
      }

      .bottom-btn-labels {
        display: flex;
        flex-direction: column;
        align-items: flex-start;

        .main-label {
          font-size: 18px;
          font-weight: 800;
        }

        .sub-label {
          font-size: 12px;
          color: rgb(255 255 255 / 80%);
        }
      }
    }

    .bottom-web-btn {
      padding: 16px 28px;
      background: transparent;
      color: #fff;
      border: 1px solid rgb(255 255 255 / 30%);
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgb(255 255 255 / 10%);
        border-color: #fff;
      }
    }
  }
}

// ---------------- 页脚 ----------------
.landing-footer {
  background: #2b1a11;
  color: #cbbbae;
  padding: 48px 24px;
  font-size: 13px;

  &__inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;
  }

  .footer-logo {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 900;
    color: #fff;
    font-family: var(--ft-font-family-title, serif);
  }

  .footer-slogan {
    margin: 0 0 6px;
    color: #e2d7cc;
  }

  .footer-meta {
    margin: 0;
    font-size: 12px;
    color: #9f8c7e;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 20px;

    .footer-link {
      color: #cbbbae;
      text-decoration: none;
      transition: color 0.2s ease;

      &:hover {
        color: #fff;
      }
    }

    .footer-link-btn {
      background: transparent;
      border: none;
      color: #cbbbae;
      cursor: pointer;
      font-size: 13px;
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
  bottom: 28px;
  right: 28px;
  z-index: 999;
  background: #fff;
  border: 2px solid $c-secondary;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 6px 8px 0 rgb(58 36 24 / 25%);
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 380px;

  .toast-icon {
    font-size: 28px;
  }

  .toast-body {
    flex: 1;

    .toast-title {
      font-size: 15px;
      font-weight: 800;
      color: $c-secondary;
      margin-bottom: 2px;
    }

    .toast-desc {
      font-size: 12px;
      color: $c-text-muted;
      line-height: 1.4;
    }
  }

  .toast-close {
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;

    &:hover {
      color: $c-secondary;
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
  transform: translateY(16px);
}
</style>
