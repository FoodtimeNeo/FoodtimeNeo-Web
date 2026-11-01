# 社区内容管理

普通用户只能删除自己的帖子、评论和回复。`admin`、`superadmin` 可以在社区帖子详情（独立页面或信息流弹窗）删除他人的帖子、评论和回复，须填写 1–500 字的删除原因。

- 作者删除继续使用 `/community/posts/{id}`、`/community/comments/{id}`。
- 管理删除使用 `DELETE /admin/community/posts/{id}`、`DELETE /admin/community/comments/{id}`，请求体为 `{ "reason": "删除原因" }`。
- 上述路径均以 `/api/v1` 为前缀；Cookie、CSRF 及管理员权限由后端独立校验。
- 确认期间阻止重复提交；取消不发送请求，失败保留内容并显示错误，成功后刷新列表或退出详情。
- 删除一级评论后，已通过的楼内回复保留。删除属于软删除，后端记录操作者与原因。

公告创建、编辑、设置当前公告及 Markdown 预览位于 `superadmin` 的“管理中心 → 公告管理”。公告正文使用关闭原始 HTML 的 Markdown 解析器，并经 DOMPurify 清洗。普通用户可以阅读公告，`admin` 不具备公告配置权限。

回归入口：`useCommunityRemoval.spec.js`、`CommunityManagement.spec.js`、公告管理与 Markdown 的既有测试。完整质量检查为 `npm run check`。
