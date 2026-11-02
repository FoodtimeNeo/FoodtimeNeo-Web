# v1.1.1 发布说明

Web项目版本为1.1.1，使用develop → main发布PR。保留历史v1.1.0标签，本次新标签为v1.1.1。

本次集成公告管理与Markdown展示、审核发布者详情、超级管理员数据看板、落地页滚动及页脚修复，以及代理证书验证、生产CSP和依赖安全补丁。构建环境要求Node.js≥24.15。

网站下载APK必须取自Android本次main合并后发布的v1.1.1正式Release，versionName为1.1.1，versionCode为6；沿用原发布证书。使用正式附件替换public/downloads/FoodtimeNeo-Android.apk，附带SHA-256校验文件和来源记录。APK内嵌Git提交、Release目标与来源记录须指向同一个Android main合并提交。

下载URL包含版本参数以避免旧包缓存；下载版本、大小与更新时间由本次制品同步更新。代码检查、单元测试、生产构建以及APK来源/哈希校验全部通过后合并main。main构建产物不等于已部署到云端站点。
