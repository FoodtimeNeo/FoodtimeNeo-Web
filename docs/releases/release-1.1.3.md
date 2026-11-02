# v1.1.3 发布说明

Web 项目版本为 `1.1.3`，默认使用 `develop → main` 发布 PR；负责人明确授权本地合并推送时保留发布合并历史。

## 更新范围

- `admin`、`superadmin` 可在社区详情页和信息流弹窗删除他人帖子、评论和回复，填写 1–500 字原因。普通用户只能删除自己的内容。
- “我的 → 编辑资料”支持修改昵称、上传或移除头像；保留原头像、输入校验、上传预览、失败重试和账号切换隔离均有回归。
- 核查公告创建、编辑、当前公告设置和 Markdown 展示；公告管理仍仅限 `superadmin`。
- 保留 v1.1.2 的客户端标识头、输入长度限制和食堂轮播修复。

权限及接口说明见 [社区内容管理](../modules/community-management.md)。

## Android 下载制品

网站下载包取自 Android `dev → main` 合并提交通过 CI 后正式 CD 的 `v1.1.3` Release（versionCode `8`），验证固定签名、版本、SHA-256 后同步 APK、校验文件、来源 JSON、下载常量和测试。

正式制品来源为 [Android v1.1.3](https://github.com/FoodtimeNeo/FoodtimeNeo-Android/releases/tag/v1.1.3) 和 [签名 CD](https://github.com/FoodtimeNeo/FoodtimeNeo-Android/actions/runs/41300498918)，对应 main 合并提交 `2a67c1b27ae50bdfbded6660b00ac64afa1eb94f`。APK 为 20,871,953 字节，SHA-256 为 `3a74748b27dc74a67901124795232013c96e9d4059a3bd3af92d3f1786051b8f`，已验证沿用原发布证书。

正式发布前运行 `npm run check`。本地浏览器检查使用隔离接口样例，验证资料保存和管理员删除确认、原因校验、评论刷新；它不代表对生产数据库进行了写入验收。GitHub main 合并不等于服务器部署，当前 Web 没有启用服务器自动部署。
