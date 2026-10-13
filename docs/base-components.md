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
  <StampBadge>今日推荐</StampBadge>
  <InkButton variant="primary" :disabled="saving" @click="save">
    保存
  </InkButton>
</PaperCard>
```
