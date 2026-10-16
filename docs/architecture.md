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
│   ├── backend-integration.md  # 现有后端接口映射与安全边界
│   ├── verification.md         # 本轮检查与真实联调记录
│   ├── README.md               # 文档索引与适用范围
│   ├── local-development.md    # 环境、代理与三端联调
│   ├── ci-cd.md                # CI与交付范围
│   └── design-style-web.md     # 视觉规范
├── scripts/git/                # 分支脚本与 CI 校验（Node，无第三方依赖）
├── scripts/dev/                # 开发代理目标检查（本机或明确指定的服务器来源）
├── src/
│   ├── api/                    # HTTP 客户端与按领域划分的接口模块
│   ├── assets/                 # 图片、字体、styles/（tokens + global）
│   ├── components/             # 跨页面复用组件，按领域分子目录
│   │   ├── base/               #   与业务无关的手账风基础组件（按钮、卡片、印章）
│   │   └── <domain>/           #   canteen / dish / review / submission / admin
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
├── CLAUDE.md                   # 开发入口规则，AI 编码工具自动读取
├── README.md
├── index.html                  # Vite 页面入口
├── package.json                # 依赖、脚本、Prettier 配置
├── package-lock.json
├── vite.config.js              # 构建、代理、别名、Vitest 配置
├── eslint.config.js
└── .nvmrc / .env.example / .gitignore / .gitattributes / .prettierignore
```

空目录用 `.gitkeep` 占位，首个真实文件加入后删除。根目录只放工具要求必须在根目录读取的文件；能合并的配置合并进 `package.json` 或 `vite.config.js`，不新增独立配置文件。`.prettierignore` 只保留 `package-lock.json`，其余忽略项由 Prettier 默认读取 `.gitignore` 处理。

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
- `store` 只放跨页面共享状态（会话、当前用户、角色、目录搜索词）。单页数据留在页面或 composable 中。
- 导入 `src/` 内模块统一使用 `@/` 别名，同目录可用相对路径。

## 3. 路由树

```text
/                                                    home
/canteens                                            canteenList
/canteens/:canteenId                                 canteenDetail
/canteens/:canteenId/stalls/:stallId                 stallDetail
/canteens/:canteenId/stalls/:stallId/dishes/:dishId  dishDetail
  …/dishes/:dishId/gallery                           dishGallery
…/dishes/:dishId/reviews/new                          当前菜品点评（无独立导航入口）
…/dishes/:dishId/images/new                           图片投稿
…/stalls/:stallId/submissions/new                     菜品投稿
…/:canteenId/submissions/new                          档口投稿
/profile /profile/reviews /profile/submissions       本人身份与历史
/profile/password                                    修改本人密码
/login  /register                                    鉴权
/admin/audit /admin/moderation/logs                   内容审核与日志
/admin/manage /admin/reviews                          目录与正式评论管理
/superadmin/users                                    用户权限（requiresSuperadmin）
```

以上页面已实现并要求服务端会话；管理页面另外要求相应实际角色。`/superadmin` 保留为用户管理的跳转入口。每一级详情和投稿返回路由树中的父级，不依赖浏览器历史。不存在的后端功能不注册业务入口。

`useAsyncData` 负责取消旧读取并丢弃迟到结果，`usePagedData` 校验统一分页结构。目录编辑的取数、上传和保存保留在 `views/admin/CatalogEditorFormView.vue`，通用父级选择控件由页面提供分页加载函数。界面组件不直接导入 API。

`CatalogSearch` 只展示输入、清除按钮及实际结果数量。`useCatalogSearch` 对当前已加载目录的名称进行本地匹配，兼容全角字符、大小写和多个关键词，不新增聚合查询接口。`useCatalogSearchStore` 在内存中按当前用户和具体食堂/档口保留最多50处关键词，返回列表时恢复；不持久化账号、业务数据或搜索记录。

认证状态只在内存中保留；HttpOnly Cookie 由浏览器管理。HTTP 层限制同站请求、单次获取 CSRF、不自动重放写请求，并在会话轮换时阻止旧写入和迟到响应。上传预览在页面离开时释放，媒体引用经过安全路径验证。

`ImageFileField` 只做本地选图、解码校验和预览，通过 `change` 返回有效文件或空值，通过 `checking` 告知解码状态；不会自行上传。新选择与清除使旧解码失效，外部 `validationMessage` 与内部错误一同关联到输入框，暴露 `focus()` 供投稿错误摘要定位。

## 4. 页面外壳

`App.vue` 按完整路由地址（含查询参数）和用户 ID 创建页面；外壳在 `layouts/` 中实现，路由通过 `meta.layout` 选择（`default` / `blank` / `admin`，blank 用于登录页）。桌面端（>768px）顶部导航 + 面包屑，移动端（≤768px）简化顶栏 + 底部 Tab。

“我的提交”用 `kind=review|dish|stall|photo` 表示当前类型，未指定或非法值回退为点评。切换类型替换当前地址并从第一页读取该类型的既有接口，刷新保留类型；不将查询参数直接拼接到接口路径。“我的评论”只展示正式评论，空态可进入点评审核记录。

## 5. 测试

- 单元测试与源文件同目录，命名 `*.spec.js`。
- 测试覆盖：`utils` 纯函数、`api` 字段适配与错误映射、`store` 行为、`router` 守卫、组件的交互与状态（加载 / 空 / 错误）。
- 接口替身只存在于单元测试，不注入应用运行；真实联调使用经确认的隔离库。不存在本地身份、Mock 业务数据或失败后的模拟成功回退。

### 管理入口

普通用户的主导航为“食堂 / 我的”，管理员和平台管理员在中间增加“管理”；桌面与移动端共用角色判断。管理下的审核、目录、正式评论、日志和平台用户页面统一高亮“管理”。重复点击当前栏目保留当前页面及参数；首页可由品牌链接进入。所有管理路由仍须由前后端验证权限。
