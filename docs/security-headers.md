# 生产网页安全策略

生产构建自动在 HTML 头部加入 CSP，禁止内联脚本、eval、对象嵌入、跨站脚本与跨站 API 请求。图片继续兼容旧 HTTPS 媒体地址；字体只允许当前 Google Fonts 来源。Vue/Element Plus 动态样式需要 `style-src 'unsafe-inline'`，该许可不适用于脚本。

这份策略不代替 Vue 转义与公告 Markdown 清洗。开发模式不注入生产策略，以支持 Vite HMR；开发服务仅监听 localhost，HTTPS 代理始终验证服务器证书。

反向代理的 HTML 响应还应保留 HSTS、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: no-referrer`。CSP 的 `frame-ancestors` 不支持 meta，需由 Nginx 响应头配置：

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
```

新增外部脚本/API/字体前需明确来源并更新策略。不要为消除控制台提示放宽到 `script-src *`、`unsafe-inline` 或 `unsafe-eval`。Nginx 若在 location 中另加 header，须检查继承规则，避免其它安全头被覆盖。
