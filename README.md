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

已接通现有 Backend 的 Cookie/CSRF 认证、真实食堂/档口/菜品浏览、分页图册和点评、图片/菜品/档口投稿、个人记录、内容审核、目录与正式评论管理，以及平台管理员用户管理。邀请码、吐槽、推荐/避雷、今日推荐和排行榜没有对应后端接口，页面不提供这些入口。

本地浏览器使用 `http://localhost:5173`；后端默认代理到 `http://127.0.0.1:8080`。可通过 `VITE_API_PROXY_TARGET` 指定另一本机后端，并使用 `npm run dev -- --port 3000`，浏览器仍使用 localhost。当前 Backend 的开发来源白名单只包含 localhost 的 5173 和 3000 端口。前端固定从同站 `/api/v1` 请求，生产环境须配置 HTTPS 与同站反向代理。

本轮经确认复用隔离联调库，验收地址为 `http://localhost:3000`，对应未修改的 Backend 程序在 18080 端口。运行参数和样例凭据只留在本地忽略目录，不进入代码仓库。邮箱投递暂未接通；注册页面保留真实验证码流程及服务端错误，不提供模拟验证码。

接口映射、权限及字段边界见 [docs/backend-integration.md](docs/backend-integration.md)，验收范围见 [docs/verification.md](docs/verification.md)。
