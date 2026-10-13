# FoodtimeNeo-Web 开发规则

本文档是项目开发的入口规则，适用于人工开发和 VibeCoding。架构与分层见 [docs/architecture.md](docs/architecture.md)，编码细则见 [docs/development-rules.md](docs/development-rules.md)，视觉要求见 [docs/design-style-web.md](docs/design-style-web.md)。规则与工程配置冲突时，以当前 `package.json`、ESLint、Prettier、Vitest、Vite 和 CI 的可执行结果为准，并同步修正文档。

## 1. 技术基线

- 使用 Node.js 24、npm、Vue 3、Vite、JavaScript。
- 路由、状态、请求和组件库分别使用 Vue Router、Pinia、Axios、Element Plus。
- 样式使用 SCSS；颜色、字体、间距、阴影和装饰优先引用设计令牌。
- 依赖版本以 `package.json` 和 `package-lock.json` 为准，不混用其他包管理器。
- 新增依赖前先确认现有依赖不能满足需求，并说明用途和包体积影响。

## 2. 开发步骤

开始编码前必须明确：

1. 本次改动的目标和不处理的范围。
2. 页面输入、接口响应、用户权限和路由关系。
3. 加载态、空态、错误态和成功态。
4. 可执行的验收方式。

实现时只修改与当前目标直接相关的文件。发现周边问题时先记录，不顺带重构。Mock、占位页面或静态数据必须明确标注，不得描述为已经完成后端联调。

## 3. 目录与分层

```text
src/
├── api/          # HTTP 请求与响应适配
├── assets/       # 图片、字体和全局样式
├── components/   # 跨页面复用组件
├── composables/  # 可复用组合式逻辑
├── layouts/      # 页面外壳
├── router/       # 路由与导航守卫
├── store/        # 跨页面状态
├── utils/        # 优先存放纯函数
└── views/        # 页面与页面编排
```

- 页面不得直接拼接接口地址；请求统一放在 `src/api/`。
- 局部状态保留在组件中，跨页面状态才进入 Pinia。
- 重复交互提取为组件或 composable，避免跨页面复制实现。
- 路由页面默认使用懒加载，业务路径使用 `kebab-case`，路由名称使用 `camelCase`。

## 4. 命名与代码

- 目录使用 `kebab-case`。
- Vue 组件使用 `PascalCase.vue`，页面使用 `PascalCaseView.vue`。
- composable 使用 `useXxx.js`，Store 使用 `useXxxStore.js`，接口模块使用 `xxx.api.js`。
- 使用组合式 API、`const`/`let`、单引号、分号和 2 空格缩进。
- 模板中不放复杂表达式；复杂逻辑移动到计算属性、函数或 composable。
- 注释说明设计原因、边界和副作用。公共 API 或复杂逻辑使用 JSDoc，自解释代码不写重复注释。

## 5. UI 约束

- 保持食堂手账、zine 拼贴、牛皮纸、印章、贴纸和硬阴影的视觉语言。
- 页面信息结构按照新项目路由设计，不照搬旧项目组件树。
- 桌面端保留完整手账感；移动端优先信息层级和可操作性。
- 装饰不得遮挡内容、占用点击区域或造成横向溢出。
- 通用视觉值集中维护在 `src/assets/styles/tokens.scss`，通用基础样式维护在 `src/assets/styles/global.scss`。

## 6. 接口与安全

- 环境变量必须使用 `VITE_` 前缀，不提交密钥、令牌或真实环境凭据。
- 统一处理超时、鉴权失效、权限不足和服务端错误，不吞掉异常。
- 用户输入需要基础校验；权限和数据所有权最终由后端验证。
- 不保存明文密码、私钥或服务端密钥，不直接渲染未经处理的 HTML。

## 7. 测试与质量门禁

提交前必须执行：

```sh
npm run check
```

该命令必须通过 ESLint、Prettier、Vitest 和生产构建。新增或修改业务逻辑时必须补充能验证行为的测试；不得只复制实现细节写无意义测试。`test:unit` 不允许空测试集通过。

## 8. Git 工作流

完整规范见 [docs/git-workflow.md](docs/git-workflow.md)，要点：

- `main` 可发布，`develop` 集成，二者只能通过 PR 合入，CI 在 PR 与合并时运行。
- 一个功能一个分支 `feature/<kebab-name>`，缺陷用 `fix/<kebab-name>`，都合入 `develop`。
- 开始开发统一执行 `npm run feature -- <name>`：分支不存在则从最新 `develop` 创建；已存在则先指向 `develop` 最新状态再继续开发。
- 提交信息使用 Conventional Commits，例如 `feat(canteen): 实现食堂列表`。一个提交对应一个可解释、可验证的改动，说明必须来自实际差异。

## 9. 完成标准

一项任务只有同时满足以下条件才算完成：

- 目标功能和必要状态已经实现。
- 代码、文档和配置保持一致。
- `npm run check` 通过。
- 已说明实际验证结果、未验证项和外部阻塞。
- 工作区没有被意外加入的构建产物、凭据或无关修改。
