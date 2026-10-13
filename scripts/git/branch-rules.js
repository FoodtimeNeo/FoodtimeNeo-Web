/**
 * Git 分支与提交命名规则。CI 与本地脚本共用，规则说明见 docs/git-workflow.md。
 */
export const INTEGRATION_BRANCH = 'develop';
export const RELEASE_BRANCH = 'main';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
export const WORK_BRANCH_PATTERN = new RegExp(`^(feature|fix)/${SLUG}$`);
export const HOTFIX_BRANCH_PATTERN = new RegExp(`^hotfix/${SLUG}$`);
export const FEATURE_NAME_PATTERN = new RegExp(`^${SLUG}$`);

export const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

const COMMIT_PATTERN = new RegExp(
  String.raw`^(${COMMIT_TYPES.join('|')})(\([a-z0-9-]+\))?!?: \S.*$`,
);

/**
 * 校验 PR 的源分支能否合入目标分支。
 * @param {string} head 源分支
 * @param {string} base 目标分支
 * @returns {string | null} 不合法时返回原因
 */
export function validatePullRequestBranches(head, base) {
  if (base === INTEGRATION_BRANCH) {
    if (WORK_BRANCH_PATTERN.test(head) || HOTFIX_BRANCH_PATTERN.test(head)) {
      return null;
    }
    return `合入 ${INTEGRATION_BRANCH} 的分支须命名为 feature/<name> 或 fix/<name>，当前为 ${head}`;
  }
  if (base === RELEASE_BRANCH) {
    if (head === INTEGRATION_BRANCH || HOTFIX_BRANCH_PATTERN.test(head)) {
      return null;
    }
    return `只有 ${INTEGRATION_BRANCH} 或 hotfix/<name> 可以合入 ${RELEASE_BRANCH}，当前为 ${head}`;
  }
  return `PR 目标分支只能是 ${INTEGRATION_BRANCH} 或 ${RELEASE_BRANCH}，当前为 ${base}`;
}

/**
 * 校验单条提交标题（Conventional Commits）。合并提交和 revert 自动生成的标题放行。
 * @param {string} subject
 * @returns {boolean}
 */
export function isValidCommitSubject(subject) {
  if (/^Merge (pull request|branch|remote-tracking branch) /.test(subject)) {
    return true;
  }
  if (/^Revert ".+"$/.test(subject)) return true;
  return subject.length <= 72 && COMMIT_PATTERN.test(subject);
}
