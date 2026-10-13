# FoodtimeNeo-Web 开发约定

## 目录职责

- `src/views/`：页面与页面编排。
- `src/components/`：跨页面复用的 UI。
- `src/router/`：路由、返回关系和导航守卫。
- `src/api/`：统一的请求与响应适配；页面不直接拼接接口地址。
- `src/store/`：跨页面状态；局部状态保留在组件中。
- `src/assets/styles/`：设计令牌与全局样式。
- `src/utils/`：优先存放纯函数。

功能分支用 `feat/<范围>`，缺陷分支用 `fix/<具体问题>`。提交信息使用 Conventional Commits，例如 `feat(canteen): 实现食堂列表`。一个提交对应一个可解释且可验证的改动；测试和实现可以放在同一提交。

开始功能前说明页面输入、接口响应、权限、空态和错误态。提交前运行 `npm run check`，在 PR 中记录实际验证结果。设计色值集中维护在 `tokens.scss`，组件优先引用变量。未接入后端的页面必须明确标注 Mock 状态。

`main` 用于可发布版本，`develop` 用于集成，功能分支从 `develop` 创建。完整分支、提交和验收规划保存在工作区根目录 `../FoodtimeNeo-Web-开发规划.md`。
