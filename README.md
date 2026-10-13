# FoodtimeNeo-Web

FoodTime 前端重建项目。视觉效果参照食堂手账风格，页面按食堂、档口、菜品、图册重新组织。

项目总规划见本地 `../FoodtimeNeo-Web-开发规划.md`；开发入口规则见 [CLAUDE.md](CLAUDE.md)（AI 编码工具会自动读取），架构见 [docs/architecture.md](docs/architecture.md)，Git 规范见 [docs/git-workflow.md](docs/git-workflow.md)，详细约定见 [docs/development-rules.md](docs/development-rules.md)，视觉基线见 [docs/design-style-web.md](docs/design-style-web.md)。

## 本地开发

使用 Node.js 24 和 npm。安装依赖后运行：

```sh
npm ci
npm run dev
```

PowerShell 中若 `npm` 执行策略受限，可用 `npm.cmd`。

## 检查

```sh
npm run check
```

检查包含 ESLint、Prettier、Vitest 和构建，与 CI 的质量门禁一致。CI 在向 `main` / `develop` 发起 PR 和合并后触发，PR 还会校验分支流向与提交标题。

## 开始一个功能

```sh
npm run feature -- canteen-list
```

分支不存在时从最新 `develop` 创建 `feature/canteen-list`；已存在时先指向 `develop` 最新状态再继续开发。详见 [docs/git-workflow.md](docs/git-workflow.md)。

当前只提供可运行骨架、工具链和基础页面占位。业务页面、设计素材、接口对接由后续分支完成。
