# CI与交付范围

当前可执行配置为 [CI工作流](../.github/workflows/ci.yml)，没有自动部署Web到服务器的CD工作流。

发布版本维护在 `package.json`、`package-lock.json` 和 [更新日志](../CHANGELOG.md)。v1.1.0 的更新内容为“增加菜品评论点赞、回复功能”，从最新 `develop` 发起到 `main` 的发布 PR，并使用合并提交保留历史。CI 通过后在发布提交创建 `v1.1.0` 标签和同名 GitHub Release；Release 与服务器部署分别处理。

| 事件                                   | 实际执行                                                  |
| -------------------------------------- | --------------------------------------------------------- |
| main/develop的PR打开、更新、重开、编辑 | 分支及PR/新提交标题检查；Lint、Prettier、Vitest和Vite构建 |
| push到main/develop                     | 质量门禁；Git规范任务只在PR执行                           |
| push到main且质量步骤成功               | 上传 `dist` 构建产物，保留7天                             |
| 仅push功能分支                         | 当前工作流不触发；推送前本地运行 `npm run check`          |

Git校验入口为 `scripts/git/check-pr.js`，规则见 [Git工作流](git-workflow.md)。PR标题始终校验；提交标题只校验尚未进入远端main/develop的新提交，避免已有发布历史再次被旧标题阻挡。该行为不代表取消新提交规范。

CI使用 `.nvmrc` 的Node版本和 `npm ci` 安装锁定依赖，不需要真实登录凭据。单元测试及构建成功不证明线上API、SMTP、移动设备或服务器反向代理通过验收。历史实际联调范围见 [验收记录](verification.md)。

仓库文件不能证明GitHub分支保护已启用；实际管理员设置以仓库规则为准。负责人明确授权直接集成时，仍先在功能分支提交、验证并合并回develop，push后等待质量门禁；不因此直接修改main。发布流程与合并后同步main的方法见 [Git工作流](git-workflow.md)。
