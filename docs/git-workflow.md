# Git 工作流

## 1. 分支

| 分支             | 作用             | 来源           | 合入                                    |
| ---------------- | ---------------- | -------------- | --------------------------------------- |
| `main`           | 可发布版本       | —              | 只接受 `develop`、`hotfix/*`            |
| `develop`        | 功能集成         | `main`         | 只接受 `feature/*`、`fix/*`、`hotfix/*` |
| `feature/<name>` | 一个功能一个分支 | 最新 `develop` | `develop`                               |
| `fix/<name>`     | 已合入功能的缺陷 | 最新 `develop` | `develop`                               |
| `hotfix/<name>`  | 线上紧急修复     | `main`         | `main`，随后同步回 `develop`            |

`<name>` 使用 kebab-case，描述功能本身而不是任务编号，例如 `feature/canteen-list`、`feature/dish-gallery`、`fix/login-redirect`。`main` 和 `develop` 禁止直接推送，所有改动经 PR 合入。CI 会拒绝不符合上表流向的 PR。

## 2. 功能分支的生命周期

功能以分支为单位。同一个功能始终使用同一个分支名，第二次开发时复用它，而不是新建 `feature/xxx-2`。

```sh
npm run feature -- canteen-list
```

脚本先 `git fetch`，再按分支状态处理：

| 状态                           | 行为                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| `feature/canteen-list` 不存在  | 从 `origin/develop` 创建                                   |
| 已存在，提交都已合入 `develop` | 把分支重新指向 `origin/develop` 最新状态，继续开发         |
| 已存在，仍有未合入的提交       | 停止并提示；加 `--rebase` 则把这些提交变基到最新 `develop` |
| 有未提交改动，或本地与远端分叉 | 停止，需要先手动处理                                       |

缺陷分支使用 `npm run feature -- login-redirect --fix`，规则相同。

手动执行等价于：

```sh
git fetch origin --prune
# 新功能
git switch -c feature/canteen-list --no-track origin/develop
# 已有功能且已合入：指向 develop 最新状态
git switch -C feature/canteen-list origin/develop
```

## 3. 开发到合并

1. `npm run feature -- <name>` 切到功能分支。
2. 小步提交，每个提交可独立解释和验证。
3. 推送：首次 `git push -u origin feature/<name>`；分支被重新指向 `develop` 或变基后，使用 `git push --force-with-lease`（只允许用于自己的功能分支）。
4. 向 `develop` 发起 PR，按模板填写验证结果，等待 CI 通过和人工审查。
5. 合并方式使用 **Squash and merge**，PR 标题即合并提交标题，须符合提交规范。
6. 发布时由 `develop` 向 `main` 发起 PR，使用 **Create a merge commit** 保留集成历史。

从 `main` 同步历史以解决发布冲突的 `hotfix/*` PR 也使用 **Create a merge commit**，以保留 `main` 的祖先关系。

合并前若 `develop` 有新提交，在功能分支上执行 `npm run feature -- <name> --rebase` 同步，不要把 `develop` merge 进功能分支。

## 4. 提交信息

使用 Conventional Commits，标题不超过 72 个字符：

```text
<type>(<scope>): <摘要>
```

- `type`：`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`
- `scope`：可选，kebab-case，通常是领域名，如 `canteen`、`dish`、`router`
- 破坏性变更在类型后加 `!`，并在正文说明迁移方式

示例：`feat(canteen): 实现食堂列表`、`fix(router): 修复登录后跳转丢失参数`。

CI 校验 PR 标题及尚未进入远端 `main` / `develop` 的新提交标题。发布与热修复携带的已有主分支历史不重复校验，避免旧标题阻挡发布；新提交仍须符合规范。GitHub 生成的 `Merge pull request …`、`Revert "…"` 自动放行。

## 5. 仓库设置（需管理员在 GitHub 配置）

以下规则无法由仓库文件生效，需在 Settings → Rules / Branches 中配置：

- `main`、`develop`：Require a pull request before merging；Require status checks（`Git 规范`、`质量门禁`）；禁止 force push 与删除。
- `develop`：Allow squash merging；`main`：Allow merge commits。
- 开启 Automatically delete head branches 时需注意：功能分支会被删除，再次开发同一功能时脚本会从 `develop` 重新创建同名分支，行为一致。
