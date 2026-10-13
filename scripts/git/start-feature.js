#!/usr/bin/env node
/**
 * 开始或继续一个功能分支：npm run feature -- <name> [--fix] [--rebase]
 *
 * - 分支不存在：从 origin/develop 最新状态创建 feature/<name>。
 * - 分支已存在且其提交都已合入 develop：把分支指向 origin/develop 最新状态。
 * - 分支已存在且有未合入 develop 的提交：默认停止，避免丢失工作；
 *   传 --rebase 时把这些提交变基到 origin/develop 上继续开发。
 */
import { execFileSync } from 'node:child_process';
import { FEATURE_NAME_PATTERN, INTEGRATION_BRANCH } from './branch-rules.js';

const REMOTE = 'origin';
const BASE = `${REMOTE}/${INTEGRATION_BRANCH}`;

function git(args, { quiet = false } = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function refExists(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref], { quiet: true });
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const name = args.find((arg) => !arg.startsWith('--'));
const prefix = args.includes('--fix') ? 'fix' : 'feature';
const allowRebase = args.includes('--rebase');

if (!name || !FEATURE_NAME_PATTERN.test(name)) {
  fail('用法：npm run feature -- <kebab-case 名称> [--fix] [--rebase]');
}

if (git(['status', '--porcelain'])) {
  fail('工作区有未提交的改动，请先提交或 stash。');
}

const branch = `${prefix}/${name}`;
const remoteBranch = `${REMOTE}/${branch}`;

git(['fetch', REMOTE, '--prune']);

const hasLocal = refExists(`refs/heads/${branch}`);
const hasRemote = refExists(`refs/remotes/${remoteBranch}`);

if (!hasLocal && !hasRemote) {
  git(['switch', '-c', branch, '--no-track', BASE]);
  console.warn(`✓ 已从 ${BASE} 创建 ${branch}`);
  console.warn(`  首次推送：git push -u ${REMOTE} ${branch}`);
  process.exit(0);
}

// 本地与远端都存在时以本地为准；只存在远端时取远端。
const current = hasLocal ? branch : remoteBranch;
const unmerged = git(['rev-list', '--count', `${BASE}..${current}`]);

if (hasLocal && hasRemote) {
  const unpushed = git(['rev-list', '--count', `${remoteBranch}..${branch}`]);
  const unpulled = git(['rev-list', '--count', `${branch}..${remoteBranch}`]);
  if (unpulled !== '0' && unpushed !== '0') {
    fail(`${branch} 与 ${remoteBranch} 已分叉，请先手动同步。`);
  }
}

if (unmerged === '0') {
  git(['switch', '-C', branch, BASE]);
  console.warn(`✓ ${branch} 已指向 ${BASE} 最新状态`);
  if (hasRemote) {
    console.warn(
      `  远端分支仍是旧位置，推送时使用：git push --force-with-lease ${REMOTE} ${branch}`,
    );
  }
  process.exit(0);
}

if (!allowRebase) {
  fail(
    `${branch} 有 ${unmerged} 个提交尚未合入 ${INTEGRATION_BRANCH}。` +
      `\n  先合并到 ${INTEGRATION_BRANCH}，或执行 npm run feature -- ${name} --rebase 把它们变基到最新 ${INTEGRATION_BRANCH}。`,
  );
}

if (hasLocal) {
  git(['switch', branch]);
} else {
  git(['switch', '-c', branch, '--track', remoteBranch]);
}
try {
  git(['rebase', BASE]);
} catch {
  fail(
    '变基出现冲突：解决后执行 git rebase --continue，或 git rebase --abort 放弃。',
  );
}
console.warn(`✓ ${branch} 已变基到 ${BASE}`);
if (hasRemote) {
  console.warn(`  推送时使用：git push --force-with-lease ${REMOTE} ${branch}`);
}
