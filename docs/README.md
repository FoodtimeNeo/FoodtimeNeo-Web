# Web 文档导航

当前发布版本为 **v1.1.0**，更新内容：**增加菜品评论点赞、回复功能**。版本记录见[更新日志](../CHANGELOG.md)。

| 需要了解的内容                       | 文档                                                       |
| ------------------------------------ | ---------------------------------------------------------- |
| 项目入口与常用命令                   | [README](../README.md)                                     |
| 本机/线上API预览、环境变量与故障排查 | [本地开发与联调](local-development.md)                     |
| 分层、路由和状态边界                 | [架构](architecture.md)                                    |
| 当前接口映射及未支持功能             | [后端接入](backend-integration.md)                         |
| 组件输入、事件与可访问性             | [基础与交互组件](base-components.md)                       |
| 视觉令牌与响应式约定                 | [设计规范](design-style-web.md)                            |
| 编码和文档更新要求                   | [开发约定](development-rules.md)、[开发入口](../CLAUDE.md) |
| 功能分支、发布及main同步             | [Git工作流](git-workflow.md)                               |
| GitHub门禁和构建产物范围             | [CI与交付](ci-cd.md)                                       |
| 已执行的检查及限制                   | [验收记录](verification.md)                                |

本轮开发文档基线为2026-10-20的 `develop`，main发布历史按各次验收保留。本仓库的开发分支继续使用 `develop`，Android和Backend使用 `dev`；不要为名称统一再创建一条Web开发分支。

菜单与详情均使用服务端实时评分汇总，无评分显示“暂无评分”。图册当前实现为分页图片展示，尚未合入的大图预览试验不能记作已发布功能。历史验收中的测试数量与环境按日期保留，不代表每个main提交或线上部署都重新验收过。

修改页面时核对 `router/routes.js`、领域API模块、对应组件和测试；修改运行或Git配置时同步核对 `.env.example`、`vite.config.js`、`scripts/` 和 `.github/workflows/`。本地预览与Git推送都不等于部署到指定服务器。

点评点赞、回复、回复点赞、我的回复及管理审核说明见[点评互动](review-interactions.md)。
