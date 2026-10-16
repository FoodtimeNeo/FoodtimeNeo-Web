# FoodtimeNeo-Web 开发约定

## 目录职责

- `src/views/`：页面与页面编排。
- `src/components/`：跨页面复用的 UI。
- `src/router/`：路由、返回关系和导航守卫。
- `src/api/`：统一的请求与响应适配；页面不直接拼接接口地址。
- `src/store/`：跨页面状态；局部状态保留在组件中。
- `src/assets/styles/`：设计令牌与全局样式。
- `src/utils/`：优先存放纯函数。
- `src/layouts/`：页面外壳；`src/composables/`：组合式逻辑；`src/constants/`：常量。
- `scripts/git/`：分支脚本与 CI 规范校验。

分支与提交规范见 [git-workflow.md](git-workflow.md)，分层与依赖方向见 [architecture.md](architecture.md)。提交信息使用 Conventional Commits，例如 `feat(canteen): 实现食堂列表`。一个提交对应一个可解释且可验证的改动；测试和实现可以放在同一提交。

开始功能前说明页面输入、接口响应、权限、空态和错误态。提交前运行 `npm run check`，在 PR 中记录实际验证结果。设计色值集中维护在 `tokens.scss`，组件优先引用变量。未接入后端的页面必须明确标注 Mock 状态。

`main` 用于可发布版本，`develop` 用于集成，功能分支 `feature/<name>` 通过 `npm run feature -- <name>` 从最新 `develop` 创建或同步。分支流程、CI和验收入口均维护在本仓库 [docs导航](README.md)，不依赖仓库外的个人规划文件。

页面或接口行为变化时同步维护架构、接口映射和相关交互组件；运行参数变化时维护本地联调说明；CI或发布规则变化时维护CI和Git文档。历史验收不覆盖改写成“当前均已通过”：新增记录应标明代码基线、实际命令、环境、通过项和未验证项。
