# FoodtimeNeo 社区功能（小红书风格）开发与交接文档

## 1. 模块定位与概述

社区功能为 FoodtimeNeo 新增的 UGC 校园美食图文分享板块。整体交互与视觉体验参考“小红书”的双列瀑布流与多图图文详情浏览，同时深度融合 FoodtimeNeo 的食堂手账、牛皮纸底色、硬阴影与印章视觉语言。

首期阶段（当前已完成范围）：

1. **导航整合**：在桌面端导航栏与移动端底部 TabBar 增设「社区」入口；
2. **排列页（Feed 列表）**：2 列自适应高度瀑布流，封面图自适应不同宽高比，卡片展示上图下标题，严格按发布时间倒序排列；
3. **发帖与审核流**：右下角常驻悬浮「+」发帖按钮，录入标题、正文与配图；新贴提交后状态置为 `pending`（待审核），社区公开页仅展示 `approved`（已通过审核）的帖子；
4. **多图详情页**：支持多图横向轮播滑动（手势触控与桌面切换）、底部圆点指示器（Dots）、单击图片全屏大图预览（Lightbox）；
5. **评论区**：展示评论人头像、ID/昵称、发布时间、评论正文，支持用户即时发表新评论；
6. **下阶段功能占位**：点赞、收藏、评论回复等交互已预留 UI 插槽与下阶段提示。

---

## 2. 路由与导航结构

### 2.1 路由配置 (`src/router/routes.js`)

| 路径                       | 路由名称          | 页面组件                  | 鉴权要求             | 说明                      |
| -------------------------- | ----------------- | ------------------------- | -------------------- | ------------------------- |
| `/community`               | `community`       | `CommunityFeedView.vue`   | `requiresAuth: true` | 社区帖子 2 列瀑布流列表页 |
| `/community/posts/:postId` | `communityDetail` | `CommunityDetailView.vue` | `requiresAuth: true` | 帖子多图详情与评论互动页  |

### 2.2 导航集成 (`src/components/layout/navigation.js`)

- `navigationItems`：顺序为 `['canteenList', 'community', 'profile']`；
- `getNavigationItems(isAdmin)`：管理员在社区与我的之间插入管理入口 `['canteenList', 'community', 'adminAudit', 'profile']`；
- 面包屑 `resolveBreadcrumbs`：社区详情页自动生成 `首页 / 社区 / 帖子详情`。

---

## 3. 组件清单与职责划分

```text
src/
├── api/
│   ├── community.api.js            # 社区数据请求适配层与本地 Mock 存储
│   └── community.api.spec.js       # 接口与审核过滤单元测试
├── components/community/
│   ├── CommunityPostCard.vue       # 瀑布流单帖卡片（上图下标题、宽高比自适应）
│   ├── PostCreateModal.vue         # 快速发帖弹窗（多图输入、快捷图库、审核拦截）
│   ├── CommunityImageViewer.vue    # 多图轮播滑动器（手势滑动、圆点指示器、单击放大灯箱）
│   └── CommunityCommentSection.vue # 评论区组件（展示列表、输入框、即时发送）
└── views/community/
    ├── CommunityFeedView.vue       # 社区排列页（2列瀑布流、审核过滤、悬浮发帖按钮）
    ├── CommunityFeedView.spec.js   # 排列页单元测试
    ├── CommunityDetailView.vue     # 帖子详情页（多图展示、作者信息、正文、评论嵌入）
    └── CommunityDetailView.spec.js # 详情页单元测试
```

---

## 4. 关键设计与算法说明

### 4.1 双列瀑布流（Waterfall / Masonry）平衡算法

- **痛点**：每个帖子的配图尺寸各不相同（包括 4:3、3:4、1:1、9:16、横图等），若使用 CSS `columns: 2` 会导致从上到下按列排布破坏时间倒序；若使用 CSS Grid 则在各浏览器中对自适应高度支持不均。
- **解决方案**：在 `CommunityFeedView.vue` 中采用**双列贪心高度分配算法**：
  ```javascript
  const columns = computed(() => {
    const left = [];
    const right = [];
    let leftHeight = 0;
    let rightHeight = 0;

    for (const post of posts.value) {
      const img = post.images?.[0];
      let estimatedHeight = 240;
      if (img && img.width && img.height) {
        const ratio = img.height / img.width;
        const clampedRatio = Math.max(0.7, Math.min(1.4, ratio));
        estimatedHeight = 180 * clampedRatio + 60;
      }

      if (leftHeight <= rightHeight) {
        left.push(post);
        leftHeight += estimatedHeight;
      } else {
        right.push(post);
        rightHeight += estimatedHeight;
      }
    }

    return { left, right };
  });
  ```
- **效果**：卡片上图下标题，左右两列高度自然均衡错落，保证时间优先倒序排布。

### 4.2 发帖与审核流设计（核心要求）

1. **状态标识**：
   - 帖子数据模型包含 `status: 'approved' | 'pending' | 'rejected'`。
2. **公开排列页过滤**：
   - `fetchCommunityPosts({ status: 'approved' })` 确保未经管理员审核的帖子绝不公开呈现。
3. **发帖提示**：
   - 提交新帖时默认 `status = 'pending'`；
   - 提交成功后提示「发帖成功！内容已提交审核，审核通过后将在社区公开展示」，并附带审核提示文案。
4. **详情页自查态**：
   - 若用户直接通过链接访问待审核帖子，详情页顶部展示黄色安全提示条：「⚠️ 当前帖子正在审核中，审核通过前仅供本人预览」。

### 4.3 多图轮播与全屏放大（Lightbox）

1. **触控与桌面交互**：
   - 监听 `touchstart` / `touchmove` / `touchend` 手势，左右滑动超过 40px 阈值平滑切换；
   - 桌面端显示悬浮翻页箭头与键盘左右方向键切换。
2. **圆点指示器（Dots）**：
   - 底部指示点联动 `currentIndex`，当前选中页呈现药丸形伸长过渡。
3. **单击放大**：
   - 点击主轮播区域唤起全屏半透明 Lightbox 遮罩（基于 `<Teleport to="body">`），支持原图缩放查看、前后翻页与 ESC/点击遮罩关闭。

---

## 5. 数据模型与 API 契约

### 5.1 帖子对象 Post

```typescript
interface CommunityPost {
  id: string; // 帖子唯一标识，如 "post-101"
  title: string; // 帖子标题（不超过 50 字）
  content: string; // 帖子正文（不超过 1000 字）
  author: {
    id: string; // 发帖人用户 ID
    name: string; // 昵称
    avatar: string; // 头像链接（为空展示文字兜底）
  };
  images: Array<{
    id: string; // 图片 ID
    url: string; // 图片链接
    width: number; // 原始宽度
    height: number; // 原始高度
  }>;
  status: 'approved' | 'pending' | 'rejected'; // 审核状态
  createdAt: string; // ISO 8601 时间戳
  likeCount: number; // 点赞数
  favoriteCount: number; // 收藏数
  commentCount: number; // 评论数
}
```

### 5.2 评论对象 Comment

```typescript
interface PostComment {
  id: string; // 评论唯一标识
  postId: string; // 所属帖子 ID
  author: {
    id: string; // 评论人 ID
    name: string; // 评论人昵称
    avatar: string; // 头像
  };
  content: string; // 评论文本内容
  createdAt: string; // ISO 8601 时间戳
  likeCount: number; // 点赞数
}
```

---

## 6. 验证与门禁检查

所有代码已严格遵循 `CLAUDE.md` 开发规范，并通过全量检查门禁：

```sh
npm run check
```

- **ESLint**：0 error, 0 warning；
- **Prettier**：全量代码样式格式化完毕；
- **Vitest 单元测试**：45 个测试套件，186 个测试用例全部通过（100% pass）；
- **Vite 生产构建**：打包产物生成正常。

---

## 7. 后续阶段（Next Stage）接手开发指南

下一阶段需完成的功能与扩展建议：

1. **点赞（Like）与收藏（Favorite）**：
   - 后端增加 `POST /community/posts/:id/like` 与 `POST /community/posts/:id/favorite` 接口；
   - 前端在 `CommunityDetailView.vue` 和 `CommunityPostCard.vue` 中绑定用户点赞/收藏状态，支持实时高亮、数字递增及防抖；
2. **评论回复（Nested Replies）**：
   - 数据模型增加 `replyTo` 或 `parentId` 字段；
   - 在 `CommunityCommentSection.vue` 中点击“回复”唤起二级输入框，并在对应评论下方缩进渲染楼中楼结构；
3. **评论点赞数**：
   - 支持对评论列表项单独点赞并实时更新计数；
4. **管理员后台审核界面（Admin Audit）**：
   - 在现有管理后台（`AdminAuditView.vue` 或新增标签）接入社区帖子待审列表 `GET /community/posts?status=pending`，管理员可点击通过（`PUT status = 'approved'`）或驳回（`PUT status = 'rejected'`）。
