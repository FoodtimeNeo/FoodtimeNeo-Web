# iOS 主屏幕 Web App（PWA）体验适配

随着原生 iOS 仓库暂停维护，苹果设备（iPhone / iPad）的日常使用体验统一由 `FoodtimeNeo-Web` 通过主屏幕 Web App（PWA）承担。

## 已实现能力

1. **主屏幕应用清单与品牌图标**
   - 新增 `public/manifest.webmanifest`（`display: "standalone"`），以及 `public/icons/` 下的 `apple-touch-icon.png`（180×180）、`icon-192.png`、`icon-512.png`、`icon-512-maskable.png` 与 `icon.svg`。
   - `index.html` 补齐 `viewport-fit=cover`、`apple-mobile-web-app-capable`、`apple-mobile-web-app-title`、`apple-mobile-web-app-status-bar-style`、`format-detection` 及预连接字体加载（不再禁止双指缩放）。
2. **安全区与状态栏深浅色联动**
   - `public/appearance-init.js` 与 `src/composables/useAppearance.js` 同步维护 `<meta name="theme-color">`（浅色 `#faf7f0` / 深色 `#1a1613`），首绘无闪烁。
   - `AppHeader`、`MobileTabBar`、`DishSearchView`、`BlankLayout` 与 `LandingView` 统一使用 `safe-area-inset-*` 与动态视口高度 `100dvh`，并配置 `scroll-padding-top/bottom`。
3. **原生手感交互细节**
   - 移动端表单输入统一 `font-size: max(16px, 1em)`，消除 iOS Safari 聚焦输入框自动放大页面。
   - 去除点击灰块（`-webkit-tap-highlight-color: transparent`）、启用 `touch-action: manipulation`、导航栏防长按选中，并为按钮与底栏图标提供轻按缩放反馈；standalone 模式下禁用纵向橡皮筋越界回弹。
   - 移动端非根标签页在顶部栏显示返回按钮（优先使用站内历史 `router.back()`，无站内历史时回退到所属一级栏目），弥补全屏模式下无 Safari 底栏的导航缺失。
   - 点击当前已激活的底部标签可平滑滚回顶部；`HomeView` 与 `CanteenListView` 使用按 `(userId, role)` 隔离的 `<KeepAlive>` 保留状态，退出或切号立即销毁缓存。
4. **桌面图标未读角标**
   - `App.vue` 监听未读信箱总数，调用 `syncAppBadge()` 同步 iOS 16.4+ 主屏幕图标角标，退出登录自动清零；不支持环境静默降级。
5. **安装引导与宣发页同步**
   - `src/components/common/IosInstallBanner.vue` 在非独立模式的 iOS 浏览器展示可关闭（14 天冷却）的安装引导条，区分 Safari 与微信/QQ 内置浏览器提示；「我的」页亦为非独立模式 iOS 用户保留常驻教程入口。
   - `/landing` 宣发页新增「iPhone / iPad · 保存到桌面」手账卡片，安装说明弹窗支持在「安卓安装包」与「苹果添加到主屏幕」之间切换。

## 平台边界说明

- 主屏幕独立模式与普通 Safari 标签页的 Cookie / 本地存储彼此隔离，添加到桌面后首次打开需重新登录一次。
- 不依赖 `navigator.vibrate()` 等 iOS Safari 未实现的 API；不改动既有 `public/sw.js` 媒体鉴权与缓存策略。
