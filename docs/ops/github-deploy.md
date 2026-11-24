# GitHub 自动部署

`main` 上的 `package.json` 版本号发生变化时，`Web Deploy` 工作流会自动检查、构建并部署到生产服务器。普通文档修改或未改版本号的合并不会触发部署。

## 触发方式

- 自动：合并带版本号变更的发布 PR 到 `main`。
- 手动：Actions → Web Deploy → Run workflow。

## 仓库 Secrets

| Secret               | 说明           |
| -------------------- | -------------- |
| `DEPLOY_HOST`        | 生产服务器地址 |
| `DEPLOY_PORT`        | SSH 端口       |
| `DEPLOY_USER`        | 受限部署用户   |
| `DEPLOY_SSH_KEY`     | CI 专用私钥    |
| `DEPLOY_KNOWN_HOSTS` | 服务器主机公钥 |

## 服务器侧行为

CI 通过 SSH 强制命令调用：

```text
/usr/local/bin/foodtime-deploy web <run_id> <commit>
```

该脚本只接受 `status`、`backend`、`web` 三个动作，并会：

1. 备份上一版页面外壳（`version.json`、`index.html`、`sw.js`、`appearance-init.js`、`assets`）、Nginx 配置和上一发布目录路径到 `/var/backups/foodtime/deploy-web-*`。
2. 校验 workflow run 的 `head_sha` 与传入 commit 一致。
3. 从固定的 `deploy-latest` Release 资源下载应用构建包（不含 APK 与补丁）。
4. 以当前发布目录的 `downloads` 为基础，按 `downloads-files.json` 只从 GitHub raw 补齐新增或变更的 APK、补丁和清单。
5. 用发布准备工具生成新的独立发布目录，并保留旧哈希资源。
6. 原子切换 `/www/wwwroot/foodtime-web` 符号链接，执行 `nginx -t` 后 reload。
7. 校验线上 `version.json`；失败时切回原发布目录。
8. 应用 `release.env` 的公开 `APP_RELEASE_*` 参数；有变化时重启后端并等待健康检查。

部署日志：`/var/log/foodtime-deploy.log`。

## 备份与保留

- 每次 Web 部署备份上一版页面外壳、Nginx 配置和上一发布目录路径。
- 每次 Backend 部署备份数据库、当前 jar 和 `.env`。
- 部署备份保留 30 天；Web 发布目录保留最近 10 个；手动 `pre-*` 备份不自动删除。
