# 精准选餐与单份预算多维搜菜（Web 端）

## 1. 功能入口与路由

- **精准选餐专页**：`/recommend`（路由名 `smartRecommend`，组件 `src/views/recommendation/SmartRecommenderView.vue`），可从首页 Hero 按钮「今天吃什么 · 精准选餐」或搜索页横幅直达。
- **统一搜菜增强**：`/canteens/search`（`DishSearchView.vue`）新增价格快捷预算、**仅看按份或碗计价（`portionOnly`）**、**品类/标签（`tags`）**、**忌口排除（`excludeTags`）**，所有参数同步至 URL Query，查看菜品详情后返回可完整保留筛选上下文。
- **菜品详情与搜索卡标签**：`DishDetailView.vue` 与 `SearchStallCard.vue` 展示结构化中文标签胶囊。
- **管理后台标签覆写**：`CatalogEditorForm.vue` 在编辑菜品时提供 4 维度标签多选与「恢复系统自动识别标签」开关。

## 2. 交互约定

- **想吃与忌口自动互斥**：将同一标签加入「忌口排除」会自动从「想吃」中移除，反之亦然，避免产生冲突条件。
- **近似放宽与一键重搜**：当精准推荐返回 `exactMode: false` 时，页面以提示横幅展示 `relaxedHints`、在菜品卡标注 `missedRequirements`，并提供一键放宽筛选按钮；统一搜菜零结果时同样支持「放宽筛选条件重试」并保留食堂与忌口。
- **帮我抽一道 / 换一道**：每次点击「帮我抽一道」或「换一道」递增 `seed` 并将已抽中菜品加入 `excludeDishIds`，避免连续抽到同一道菜。
- **状态持久**：`/recommend` 将预算、食堂、标签、忌口与非定位排序写入按用户隔离的 `sessionStorage`，跳转详情页返回不丢失状态。
