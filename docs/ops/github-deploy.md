# GitHub 自动部署

`main` 上的 `package.json` 版本号发生变化时，`Web Deploy` 工作流会自动检查、构建并部署到生产服务器。普通文档修改或未改版本号的合并不会触发部署。

## 触发方式

- 自动：合并带版本号变更的发布 PR 到 `main`。
- 手动：Actions → Web Deploy → Run workflow。

## 仓库 Secrets

| Secret | 说明 |
| --- | --- |
| `DEPLOY_HOST` | 生产服务器地址 |
| `DEPLOY_PORT` | SSH 端口 |
| `DEPLOY_USER` | 受限部署用户 |
| `DEPLOY_SSH_KEY` | CI 专用私钥 |
| `DEPLOY_KNOWN_HOSTS` | 服务器主机公钥 |

## 服务器侧行为

CI 通过 SSH 强制命令调用：

```text
/usr/local/bin/foodtime-deploy web <run_id> <commit>
```

该脚本只接受 `status`、`backend`、`web` 三个动作，并会：

1. 记录当前线上发布目录，便于回滚。
2. 校验 workflow run 的 `head_sha` 与传入 commit 一致。
3. 下载 `web-dist` artifact（构建产物与 `prepare-web-release.js`）。
4. 用发布准备工具生成新的独立发布目录，并保留旧哈希资源。
5. 原子切换 `/www/wwwroot/foodtime-web` 符号链接，执行 `nginx -t` 后 reload。
6. 校验线上 `version.json`；失败时切回原发布目录。

部署日志：`/var/log/foodtime-deploy.log`。旧发布目录不会自动删除，至少保留 7 天。
