# FoodtimeNeo-Web

FoodTime 前端重建项目。视觉效果参照食堂手账风格，页面按食堂、档口、菜品、图册重新组织。

项目总规划见本地 `../FoodtimeNeo-Web-开发规划.md`；开发入口规则见 [rules.md](rules.md)，详细约定见 [docs/development-rules.md](docs/development-rules.md)，视觉基线见 [docs/design-style-web.md](docs/design-style-web.md)。

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

检查包含 ESLint、Prettier、Vitest 和构建。初始化阶段尚无业务测试；首个业务分支必须添加测试并取消空测试许可。

当前 `feat/bootstrap` 只提供可运行骨架、工具链和基础页面占位。业务页面、设计素材、接口对接由后续分支完成。
