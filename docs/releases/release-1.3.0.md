# v1.3.0 发布说明

前端版本更新为 `1.3.0`，与 Backend / Android `v1.3.0` 同步。稳定构建仍为 `dist` 目录，CI 在 `main` 合并后上传 `dist` 制品。

## 更新范围

- **访客账号**：注册接受任意主流邮箱；非学校邮箱注册后为只读访客，「我的」页可直接绑定学校邮箱解锁发布权限。注册页展示支持的邮箱类型。
- **注册邮箱白名单**：注册校验与后端一致，只接受 QQ、163、126、Gmail、Outlook、iCloud、学校邮箱等主流域名，允许 `vip.qq.com` 之类子域，拒绝 `example.com` 与域名伪装。
- **图片上传 50MB**：投稿与社区发帖的单图上限提升到 50MB；超过 10MB 由服务端自动压缩到 5MB 左右，页面提示同步更新。
- **关注/粉丝列表**：头像改为固定尺寸，单行展示头像、昵称与回关/已关注操作。
- **管理审核**：审核卡片展示 AI 分诊建议，支持按状态筛选，修复确认交互与审核状态显示。
- **管理看板**：移除样例回退，统一在线用户与日活统计口径。
- **下载页**：发布签名 APK 后更新 `public/downloads` 制品与 `download.js` 元数据（版本、大小、更新时间、校验和）。

## 发布顺序

1. Android `dev → main` 合并，等待 CD 产出签名 APK 与 `manifest.json`；
2. 用该 APK 更新本仓库 `public/downloads/FoodtimeNeo-Android.apk`、`.json`、`.sha256` 与 `src/constants/download.js`；
3. 再合并 `develop → main`，由 CI 上传 `dist` 制品并部署。

GitHub Release、前端构建与 APK 发布都不代表云服务器上的 Backend 已部署更新。
