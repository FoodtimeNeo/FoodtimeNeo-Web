# Noto Color Emoji

全站共用的 Google 平面彩色表情字体，覆盖公告、社区、评论、私聊和输入框。
正文、标题、手写和等宽字体均在通用字体之前回退到此字体。保留文本字体的优先级，
避免普通数字、标点被表情字体中的占位字形替代；带框数字仍按完整组合显示。

- 上游：[Google Noto Emoji](https://github.com/googlefonts/noto-emoji)。
- 来源：Google Fonts `Noto Color Emoji`，字体版本 2.055，CSS 资源版本 `v50`，2026-11-11 获取。
- 官方样式地址：<https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap>。
- `sources.json` 记录每个原始 WOFF2 地址、大小和 SHA-256；文件未修改。
- `OFL.txt` 为随字体分发的 SIL Open Font License 1.1。
- 11 个分片合计 2,084,740 字节，保留上游 Unicode 范围，浏览器仅加载用到的分片。
- 字体由本站提供，不依赖运行时访问 Google Fonts。`font-display: swap` 允许加载时先显示系统字形。
- WOFF2 内包含 COLRv1 和 SVG 彩色字形，供支持相应格式的浏览器使用；不支持时回退到设备字体。

共用声明位于 `src/assets/styles/emoji.scss`，字体栈在 `tokens.scss` 中维护。
