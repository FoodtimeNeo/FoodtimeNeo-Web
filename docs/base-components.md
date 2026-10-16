# 基础组件

从 `src/components/base/` 直接引入所需组件。样式使用 `tokens.scss` 的令牌。

| 组件         | Props                                                                                           | 插槽 / 事件                              |
| ------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `PaperCard`  | `variant: 'plain' \| 'warm'`，默认 `plain`                                                      | 默认插槽为卡片内容                       |
| `InkButton`  | `variant: 'default' \| 'primary'`，`type: 'button' \| 'submit' \| 'reset'`，`disabled: boolean` | 默认插槽为按钮文字；`click` 传出原生事件 |
| `StampBadge` | `tone: 'red' \| 'blue'`，默认 `red`                                                             | 默认插槽为印章文字                       |
| `WashiTape`  | `color: 'red' \| 'blue'`，默认 `red`                                                            | 纯装饰，无插槽或事件，自动 `aria-hidden` |

状态组件也从同一目录引入：

| 组件           | Props                                  | 插槽 / 事件                      |
| -------------- | -------------------------------------- | -------------------------------- |
| `LoadingState` | `message: string`，默认“正在加载…”     | `role=status`，用于请求期间      |
| `EmptyState`   | `title: string`、`description: string` | 默认插槽可放下一步操作           |
| `ErrorState`   | `title: string`、`description: string` | 内置重试按钮，`retry` 事件供重试 |

```vue
<PaperCard variant="warm">
  <WashiTape color="red" />
  <StampBadge>食堂档案</StampBadge>
  <InkButton variant="primary" :disabled="saving" @click="save">
    保存
  </InkButton>
</PaperCard>
```

## 已有交互组件

| 组件路径                        | 主要输入                                                       | 事件与行为                                                                                                    |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `base/MediaImage.vue`           | `src`、`alt`、`empty`、`frame`（plain/polaroid/polygon）       | 媒体地址经过安全检查；空地址或加载失败显示占位，不直接渲染HTML                                                |
| `canteen/CatalogSearch.vue`     | `modelValue`、`label`、`placeholder`、`count`、`total`、`unit` | `update:modelValue`；只展示输入与数量，不发起查询；清除或Esc后焦点回到输入框                                  |
| `review/StarRatingInput.vue`    | `modelValue`、`disabled`                                       | `update:modelValue`；1–5星，方向键可循环，Home/End同步选中项与实际焦点                                        |
| `submission/ImageFileField.vue` | `disabled`、`required`、`publicationHint`、`validationMessage` | `change`返回有效File或null，`checking`表示解码状态；本地预览与清除，暴露 `focus()` 供错误摘要定位，不自行上传 |

目录搜索逻辑由 `useCatalogSearch` 处理，跨页面搜索词由store保存；图片上传由页面调用API。组件不读取当前用户或推断服务端权限，业务父级、投稿目标及错误处理由对应页面负责。
