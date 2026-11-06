# Web 端技术与运维文档导航

本文档是 `FoodtimeNeo-Web` 前端工程的系统级技术导航与运维操作速查中心。

当前前端工程版本：**v1.3.0**（日常开发集成基线为 `develop`，生产发布基线为 `main`）。

---

餐厅与档口独立点评及完整互动：见 [功能与接口说明](modules/venue-reviews.md)。

管理页单列紧凑改进：见 [布局与交互说明](modules/admin-density.md)。

评论管理详情弹窗与审核日志分类检查：见 [正式菜品点评管理](modules/managed-reviews.md)。

## 1. 文档结构索引矩阵

本仓库文档遵循统一的四级运维与架构分类体系，清晰划分运维排障、架构设计、业务模块与版本交付边界：

```
docs/
├── ops/             # 运维部署、环境联调、安全头与研发流规范
├── architecture/    # 系统分层架构、视觉设计语言、组件规范与后端契约
├── modules/         # 业务模块实现细节（审核流、社区管理、看板、公告等）
└── releases/        # 生产版本发布说明与历史环境验收证据
```

| 模块分类                             | 核心文档                                            | 运维与研发说明                                              |
| :----------------------------------- | :-------------------------------------------------- | :---------------------------------------------------------- |
| **运维与工程标准** (`ops/`)          | [本地开发与联调](ops/local-development.md)          | 本地与远程代理配置、账号调试与联调排障指引                  |
|                                      | [CI 与交付标准](ops/ci-cd.md)                       | GitHub Actions 自动化门禁规则、静态检查与构建标准           |
|                                      | [生产安全响应头](ops/security-headers.md)           | Nginx / 反向代理安全响应头（CSP、HSTS、X-Frame 等）配置规范 |
|                                      | [Git 协作规范](ops/git-workflow.md)                 | 功能分支、Rebase 策略、PR 审查标准与非快进合并规范          |
|                                      | [编码与工程约定](ops/development-rules.md)          | 代码风格规范、组件职责边界与工程化限制                      |
| **系统与架构规范** (`architecture/`) | [分层系统架构](architecture/architecture.md)        | 目录职责、依赖单向流向、路由树与状态管理拓扑                |
|                                      | [视觉设计规范](architecture/design-style-web.md)    | 食堂手账视觉语言、Design Tokens、组件规范与响应式断点       |
|                                      | [基础组件规范](architecture/base-components.md)     | 通用 UI 控件、输入校验、无障碍可访问性（a11y）标准          |
|                                      | [后端契约映射](architecture/backend-integration.md) | 后端 API 映射、Cookie/CSRF 认证边界与数据安全底线           |
| **业务功能模块** (`modules/`)        | [内容审核工作流](modules/moderation-workflow.md)    | 待审核状态机、类型筛选、AI 建议与管理员人工判定操作         |
|                                      | [平台运营看板](modules/admin-dashboard.md)          | 实时数据汇总、在线/日活口径、异常兜底呈现                   |
|                                      | [登录公告展示](modules/login-notices.md)            | 弹窗展示规则、Markdown 安全渲染、已读免弹机制               |
|                                      | [公告发布与管理](modules/notice-management.md)      | 管理端公告富文本配置、启停策略与状态流转                    |
|                                      | [社区内容管理](modules/community-management.md)     | 帖子/评论删除、敏感内容处理与个人资料（头像/昵称）管理      |
|                                      | [点评与社交互动](modules/review-interactions.md)    | 菜品点评点赞、二级回复、回复点赞与审核流联动                |
|                                      | [媒体资源缓存](modules/media-cache.md)              | 图片加载策略、骨架屏体验与客户端缓存优化                    |
|                                      | [社区验收交接](modules/handover-community.md)       | 社区三端集成与真实端到端验收记录                            |
| **版本与交付记录** (`releases/`)     | [v1.0.0 发布说明](releases/release-1.0.0.md)        | 基础框架与食堂核心数据首发                                  |
|                                      | [v1.1.1 发布说明](releases/release-1.1.1.md)        | 增强型点评与安全修复                                        |
|                                      | [v1.1.2 发布说明](releases/release-1.1.2.md)        | 社区互动与管理员控制台                                      |
|                                      | [v1.1.3 发布说明](releases/release-1.1.3.md)        | 头像维护、公告管理与完整权限加固                            |
|                                      | [v1.3.0 发布说明](releases/release-1.3.0.md)        | 访客账号、邮箱白名单、大图压缩与管理审核增强                |
|                                      | [v1.4.0 发布说明](releases/release-1.4.0.md)        | 社区互动消息、私信与增量页面刷新                            |
|                                      | [历史工程验收记录](releases/verification.md)        | 真实环境端到端验证证据与回归测试覆盖报告                    |

---

## 2. 运维与排障速查手册 (Ops Runbook)

### 2.1 常用维护与构建命令

| 操作目标           | 推荐命令           | 说明                                              |
| :----------------- | :----------------- | :------------------------------------------------ |
| **开发环境启动**   | `npm run dev`      | 启动 Vite 开发服务器（默认端口 `3000`）           |
| **完整质量门禁**   | `npm run check`    | 顺序执行类型检查、格式化检查与静态分析（CI 强制） |
| **代码格式化修复** | `npm run format`   | 运行 Prettier 自动格式化项目源码与 Markdown 文档  |
| **单元与集成测试** | `npm run test:run` | 启动 Vitest 执行无头单元测试套件                  |
| **生产打包构建**   | `npm run build`    | 输出生产优化静态资源至 `dist/`                    |
| **生产预览服务**   | `npm run preview`  | 本地拉起静态服务器模拟生产环境访问                |

### 2.2 常见运维与联调故障排查

#### ① 后端接口 401 / 403 或 CSRF 校验失败

- **排查原因**：本地 Vite 代理未正确转发 Cookie 或后端 CSRF Token 缺失。
- **解决方案**：
  1. 检查根目录 `.env.local` 中的 `VITE_API_PROXY_TARGET` 是否配置为正确后端地址（如 `http://127.0.0.1:18080`）。
  2. 确认开发服务器启动时加载了代理规则（见 `vite.config.js` 的 `server.proxy` 配置）。
  3. 详见 [本地开发与联调](ops/local-development.md) 及 [后端接入契约](architecture/backend-integration.md)。

#### ② 生产静态资源跨域与安全头告警

- **排查原因**：生产反向代理未配置推荐的安全响应头，或 CSP（内容安全策略）阻断了外部媒体资源加载。
- **解决方案**：
  - 检查部署环境 Nginx 配置，按 [生产安全响应头](ops/security-headers.md) 补齐 `Content-Security-Policy`、`X-Frame-Options`、`X-Content-Type-Options`。

#### ③ 样式与 Design Tokens 不一致

- **排查原则**：全站严格遵循“食堂手账”（Zine）风格，严禁直接使用未经定义的硬编码颜色或阴影。
- **速查路径**：参考 [视觉设计规范](architecture/design-style-web.md) 与 `src/styles/tokens.scss`。
