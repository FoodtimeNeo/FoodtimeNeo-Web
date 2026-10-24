# 社区功能开发与交接

## 当前实现

社区已连接真实后端。公开信息流为双列瀑布流，支持游标加载更多；“我的食记”和“我的收藏”分别读取个人接口。卡片使用服务端标题、作者和图片尺寸，旧记录未知尺寸时使用布局回退。

帖子标题最多50字、正文最多2000字，原创图文1–9张图片。发帖弹窗接受JPEG/PNG，校验10MB限制，可移除和前移图片，首张为封面。图片上传失败会保留当前草稿并显示错误；同一草稿重试复用请求编号和已上传结果。

帖子、评论和回复均不可编辑。发布后进入“我的食记”查看待审或驳回状态，审核通过才出现在公开信息流。

## 详情与楼中楼

`CommunityPostContent`由弹窗和独立详情路由共同使用，包含完整正文、多图轮播、点赞收藏和评论区。`CommunityImageViewer`支持滑动、方向键、圆点和大图缩放；全屏预览使用Element Plus的ImageViewer。

`CommunityCommentSection`读取一级评论游标页及每楼的回复页。回复可以针对楼内任何合法对象，始终只缩进一层；选择对象时保存根评论和实际回复ID，不把@姓名拼入正文。评论回复最多500字，待审/驳回内容仅作者可见。删除根评论后保留占位及合法回复，删除操作要求明确确认。

点赞与收藏使用显式PUT/DELETE接口，写入期间禁用重复操作，成功后更新服务端返回的状态和计数；失败保留原状态并显示错误。

## 主要文件

| 文件                                                    | 职责                                               |
| ------------------------------------------------------- | -------------------------------------------------- |
| `src/api/community.api.js`                              | 真实接口、游标、个人列表、互动及审核适配           |
| `src/views/community/CommunityFeedView.vue`             | 双列瀑布流、发现/我的/收藏分类及加载更多           |
| `src/components/community/PostCreateModal.vue`          | 标题正文、图片选择排序、上传及发布去重             |
| `src/components/community/CommunityPostContent.vue`     | 共用详情与服务端互动状态                           |
| `src/components/community/CommunityPostDetailModal.vue` | ElDialog弹窗容器                                   |
| `src/views/community/CommunityDetailView.vue`           | 独立详情路由与返回入口                             |
| `src/components/community/CommunityImageViewer.vue`     | 轮播与全屏大图                                     |
| `src/components/community/CommunityCommentSection.vue`  | 根评论/回复分页、回复对象与草稿                    |
| `src/components/community/CommunityCommentItem.vue`     | 单条评论、审核/删除状态及点赞                      |
| `src/views/admin/AdminAuditView.vue`                    | 社区审核范围、完整配图与回复上下文、人工决定及下架 |

## 接口约定

路径相对于API前缀：

| 操作           | 接口                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| 公开信息流     | `GET /community/feed/cursor`                                                    |
| 发布及详情     | `POST /community/posts`、`GET /community/posts/{id}`                            |
| 一级评论       | `GET /community/posts/{id}/comments/cursor`                                     |
| 楼内回复       | `GET /community/posts/{id}/comments/{rootId}/replies`                           |
| 提交评论或回复 | `POST /community/posts/{id}/comments`                                           |
| 点赞           | `PUT/DELETE /community/posts/{id}/like`、`/community/comments/{id}/like`        |
| 收藏           | `PUT/DELETE /community/posts/{id}/favorite`                                     |
| 个人列表       | `GET /users/me/community-posts`、`/users/me/community-favorites`                |
| 删除           | `DELETE /community/posts/{id}`、`/community/comments/{id}`                      |
| 完整社区审核   | `GET/POST/DELETE /admin/community/posts/{id}`、`/admin/community/comments/{id}` |

发布请求传`title`、`content`、`imageUrls`和`clientRequestId`。评论传`content`、`clientRequestId`；回复同时传`rootCommentId`、`replyToCommentId`。后端返回的作者与图片映射为现有组件消费的`author`、`images`结构。

公开Feed、一级评论和回复返回`items,total,hasMore,nextCursor`。详情中的`likedByMe`、`favoritedByMe`和计数均由服务端计算。社区图片按当前帖子可见性读取。

## 人工审核

管理中心的“内容审核”增加社区食记、社区评论与回复两个审核范围。选择审核动作后先读取全部图片及根楼层/实际回复对象，完整内容加载完成才允许提交决定；驳回和下架须填写原因。待审内容与终审冲突由服务端校验。

AI不确定或服务故障时转人工。一次终审成功后重复处理返回冲突，界面保留错误信息以便刷新核对。

## 验证

`npm run check`通过ESLint、Prettier、60个测试文件的237项测试及生产构建。测试覆盖真实接口适配、上传失败保留草稿、回复对象关系、重试编号、删除占位和服务端互动状态。

浏览器已完成真实上传两图、发布、完整内容审核、楼内回复与评论审核、帖子/评论点赞及收藏；390px和1180px两侧布局已检查，修正窄屏弹窗溢出。后端字段和三端完整验收说明见Backend仓库的`docs/community-schema.md`与`docs/community-delivery.md`。
