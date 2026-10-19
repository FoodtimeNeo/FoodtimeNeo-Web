# FoodtimeNeo 社区功能（小红书风格）开发与交接文档

## 1. 模块定位与概述

社区功能为 FoodtimeNeo 新增的 UGC 校园美食图文分享板块。整体交互与视觉体验参考“小红书”的瀑布流与多图图文详情浏览，同时深度融合 FoodtimeNeo 的食堂手账、牛皮纸底色、硬阴影与印章视觉语言。

当前已完成的完整功能范围：

1. **导航整合**：在桌面端导航栏与移动端底部 TabBar 增设「社区」入口；
2. **响应式瀑布流（Feed 列表）**：
   - 电脑端网页显示 3 列瀑布流，手机端显示 2 列瀑布流；
   - 封面图自适应不同宽高比（4:3、3:4、1:1、9:16、16:9 等多种版式），卡片展示上图下标题，严格按发布时间倒序排列；
   - 预置 20+ 篇高质量各大食堂美食手账帖子，呈现错落有致的瀑布流视觉体验；
3. **双发帖入口与菜品联动**：
   - **入口一**：社区页右上角常驻「＋ 发帖」按钮（同时右下角保留悬浮「+」发帖快捷键）；
   - **入口二**：在菜品详情页发表评论时，可勾选「将本评论发表至社区帖子」；发表评论后自动将点评文案与配图预填至社区发帖界面，一键发布；
4. **菜品点评配图直通图册**：
   - 菜品点评支持选填图片，用户选填的图片在提交点评时会自动上传并调用图册接口加入该菜品官方图册，与菜品页点击加号上传图片作用一致；
5. **发帖与审核机制**：
   - 新帖提交后默认状态置为 `pending`（待审核），社区公开 Feed 仅展示 `approved`（审核通过）的帖子，保证社区内容安全合规；
6. **多图详情页**：
   - 支持多图横向轮播滑动（手机端触控滑动手势 + 桌面端切换箭头）；
   - 底部圆点指示器（Dots），当前页药丸形伸长过渡；
   - 单击图片支持全屏 Lightbox 大图预览与缩放浏览；
7. **评论区与即时互动**：
   - 详情页展示发帖人、ID、发布时间、正文与配图；
   - 点赞与收藏按钮提供即时点击状态切换、数字增减与 Toast 提示，删除了“下阶段”等无意义文案；
   - 评论区支持查看评论列表、按人名快捷回复（自动填充 `@昵称`）、评论点赞以及即时发表新评论。

---

## 2. 路由与导航结构

### 2.1 路由配置 (`src/router/routes.js`)

| 路径                       | 路由名称          | 页面组件                  | 鉴权要求             | 说明                                          |
| -------------------------- | ----------------- | ------------------------- | -------------------- | --------------------------------------------- |
| `/community`               | `community`       | `CommunityFeedView.vue`   | `requiresAuth: true` | 社区帖子响应式瀑布流列表页（电脑3列/手机2列） |
| `/community/posts/:postId` | `communityDetail` | `CommunityDetailView.vue` | `requiresAuth: true` | 帖子多图详情与评论互动页                      |

### 2.2 导航集成 (`src/components/layout/navigation.js`)

- `navigationItems`：顺序为 `['canteenList', 'community', 'profile']`；
- `getNavigationItems(isAdmin)`：管理员在社区与我的之间插入管理入口 `['canteenList', 'community', 'adminAudit', 'profile']`；
- 面包屑 `resolveBreadcrumbs`：社区详情页自动生成 `首页 / 社区 / 帖子详情`。

---

## 3. 组件清单与职责划分

```text
src/
├── api/
│   ├── community.api.js            # 社区数据请求适配层与 20+ 篇高质量美食 Mock 帖子
│   └── community.api.spec.js       # 接口与审核过滤单元测试
├── components/community/
│   ├── CommunityPostCard.vue       # 瀑布流单帖卡片（上图下标题、宽高比自适应）
│   ├── PostCreateModal.vue         # 快速发帖弹窗（支持接收外部 prefill 预填数据、多图输入）
│   ├── CommunityImageViewer.vue    # 多图轮播滑动器（手势滑动、圆点指示器、单击放大灯箱）
│   └── CommunityCommentSection.vue # 评论区组件（展示列表、@快捷回复、点赞即时交互、即时发送）
└── views/
    ├── dish/
    │   ├── DishReviewCreateView.vue     # 菜品点评页（选填图片直通菜品图册 + 一键勾选同步发帖）
    │   └── DishReviewCreateView.spec.js # 菜品点评与社区联动单元测试
    └── community/
        ├── CommunityFeedView.vue        # 社区排列页（右上角发帖、电脑3列/手机2列瀑布流、审核过滤）
        ├── CommunityFeedView.spec.js    # 排列页双入口与响应式列数单元测试
        ├── CommunityDetailView.vue      # 帖子详情页（多图展示、点赞收藏即时响应、无下阶段生硬文案）
        └── CommunityDetailView.spec.js  # 详情页与交互单元测试
```

---

## 4. 关键设计与算法说明

### 4.1 响应式瀑布流（电脑 3 列，手机 2 列）高度平衡算法

- **实现原理**：在 `CommunityFeedView.vue` 中通过 `matchMedia('(max-width: 768px)')` 监听移动端视口，动态确定列数：
  ```javascript
  const colCount = isMobile.value ? 2 : 3;
  ```
- **分配算法**：维护各列累计估算高度数组 `colHeights`，遍历所有帖子，计算其第一张配图的长宽比 `clampedRatio`，将帖子贪心放入当前总高度最小的列：
  ```javascript
  let minIdx = 0;
  for (let i = 1; i < colCount; i++) {
    if (colHeights[i] < colHeights[minIdx]) {
      minIdx = i;
    }
  }
  cols[minIdx].push(post);
  colHeights[minIdx] += estimatedHeight;
  ```
- **样式配合**：`.community-waterfall` 采用 CSS Grid，桌面端 `grid-template-columns: repeat(3, minmax(0, 1fr))`，移动端媒体查询切换为 `repeat(2, minmax(0, 1fr))`，确保即使无 JS 样式也能完美对齐。

### 4.2 菜品点评与社区双向联动机制

1. **菜品点评上传图片直通图册**：
   - 用户在 `DishReviewCreateView.vue` 中选填图片；
   - 提交时先调用 `uploadImage(file)` 获得真实/Mock 图片 URL；
   - 随后调用 `submitPhoto(canteenId, dishId, { imageUrl })`，将选填图片直接入库菜品相册，功能与菜品页点击“+”添加图片完全等价。
2. **勾选同步至社区**：
   - 点评表单提供「将本评论发表至社区帖子」复选框；
   - 勾选提交后，先完成点评提交与图册上传，随后通过 `router.push({ name: 'community', state: { prefill: { title, content, images } } })` 跳转至社区页；
   - 社区页 `CommunityFeedView.vue` 在 `onMounted` 阶段读取 `history.state.prefill`，自动唤起 `PostCreateModal.vue` 并回填内容与图片。

### 4.3 发帖与审核流设计

1. **状态标识**：
   - 帖子数据模型包含 `status: 'approved' | 'pending' | 'rejected'`。
2. **公开排列页过滤**：
   - `fetchCommunityPosts({ status: 'approved' })` 确保未经管理员审核的帖子绝不公开呈现。
3. **发帖提示**：
   - 提交新帖时默认 `status = 'pending'`；
   - 提交成功后提示「发帖成功！内容已提交审核，审核通过后将在社区公开展示」。
4. **详情页自查态**：
   - 若用户直接通过链接访问待审核帖子，详情页顶部展示黄色安全提示条：「⚠️ 当前帖子正在审核中，审核通过前仅供本人预览」。

### 4.4 多图轮播与全屏放大（Lightbox）

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

所有代码已严格遵循规范，并通过全量检查门禁：

```sh
npm run check
```

- **ESLint**：0 error, 0 warning；
- **Prettier**：全量代码样式格式化完毕；
- **Vitest 单元测试**：全量测试套件通过（包含社区瀑布流、双发帖入口、菜品图片联动图册、点赞收藏等完整测试覆盖）；
- **Vite 生产构建**：生产打包顺利无阻。

---

## 7. 后续阶段（Next Stage）接手开发建议

1. **后端持久化接口对接**：
   - `POST /community/posts`：对接真实后台发帖与持久化；
   - `POST /community/posts/:id/like` 与 `POST /community/posts/:id/favorite`：对接后端用户点赞/收藏状态存储与防刷控制；
   - `GET /community/posts?status=pending`：对接管理端审核中心列表；
2. **多级评论回复（Nested Replies）**：
   - 当前已支持 `@昵称` 单级回复，后续若需要树状楼中楼，可在数据模型中增加 `replyToCommentId` 并在列表渲染时进行多级树状折叠。
