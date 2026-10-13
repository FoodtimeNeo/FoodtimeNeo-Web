# 项目架构

本文档描述 FoodtimeNeo-Web 的目录、分层和依赖方向。新增目录或改变分层时，必须在同一 PR 中更新本文档。

## 1. 目录结构

```text
FoodtimeNeo-Web/
├── .github/
│   ├── workflows/ci.yml        # CI：PR 与合并到 main / develop 时触发
│   └── pull_request_template.md
├── docs/
│   ├── architecture.md         # 本文档
│   ├── git-workflow.md         # 分支与提交规范
│   ├── development-rules.md    # 编码约定细则
│   └── design-style-web.md     # 视觉规范
├── scripts/git/                # 分支脚本与 CI 校验（Node，无第三方依赖）
├── src/
│   ├── api/                    # HTTP 客户端与按领域划分的接口模块
│   ├── assets/                 # 图片、字体、styles/（tokens + global）
│   ├── components/             # 跨页面复用组件，按领域分子目录
│   │   ├── base/               #   与业务无关的手账风基础组件（按钮、卡片、印章）
│   │   └── <domain>/           #   canteen / stall / dish / review …
│   ├── composables/            # 可复用组合式逻辑 useXxx.js
│   ├── constants/              # 枚举、文案、配置常量
│   ├── layouts/                # 页面外壳：桌面顶栏 + 面包屑 / 移动底部导航
│   ├── router/
│   │   ├── routes.js           # 路由表（唯一来源）
│   │   ├── guards.js           # 全局守卫：标题、鉴权、角色
│   │   └── index.js            # 创建 router
│   ├── store/                  # Pinia：仅存放跨页面状态
│   ├── utils/                  # 纯函数
│   ├── views/<domain>/         # 路由页面 XxxView.vue
│   ├── App.vue
│   └── main.js
└── 配置：vite / vitest / eslint / prettier / .nvmrc / .env.example
```

空目录用 `.gitkeep` 占位，首个真实文件加入后删除。

## 2. 分层与依赖方向

```text
views ──► components ──► components/base
  │            │
  ├──► store ──┼──► api ──► api/http.js
  ├──► composables
  └──► utils / constants（任何层都可依赖）
```

- 依赖只能自上而下。`components` 不导入 `views`，`api` 不导入 `store` 或 Vue。
- `views` 负责取数、组合组件和处理路由参数；`components` 通过 props / emits 通信，不直接请求接口。
- `api/*.api.js` 只做请求与响应字段适配，返回前端模型；错误统一为 `ApiError`（见 `src/api/http.js`）。
- `store` 只放跨页面共享状态（会话、当前用户、角色）。单页数据留在页面或 composable 中。
- 导入 `src/` 内模块统一使用 `@/` 别名，同目录可用相对路径。

## 3. 路由树

```text
/                                                    home
/canteens                                            canteenList
/canteens/:canteenId                                 canteenDetail
/canteens/:canteenId/stalls/:stallId                 stallDetail
/canteens/:canteenId/stalls/:stallId/dishes/:dishId  dishDetail
  …/dishes/:dishId/gallery                           dishGallery
/reviews/new  /dishes/upload  /messages  /profile    用户功能
/login  /register                                    鉴权
/admin/*                                             管理（requiresAdmin / requiresSuperadmin）
```

当前仅实现 `home` 与 `notFound`，其余随对应功能分支加入 `routes.js`。每一级页面的返回目标是路由树中的父级，不依赖浏览器历史。

## 4. 页面外壳

`App.vue` 只挂载 `RouterView`；外壳在 `layouts/` 中实现，路由通过 `meta.layout` 选择（`default` / `blank`，后者用于登录页）。桌面端（>768px）顶部导航 + 面包屑，移动端（≤768px）简化顶栏 + 底部 Tab。

## 5. 测试

- 单元测试与源文件同目录，命名 `*.spec.js`。
- 测试覆盖：`utils` 纯函数、`api` 字段适配与错误映射、`store` 行为、`router` 守卫、组件的交互与状态（加载 / 空 / 错误）。
- Mock 数据放在 `src/mock/`（需要时创建），只供测试和未接后端的页面使用，页面中须标注。
