#!/usr/bin/env node
/**
 * CI 用：校验 PR 的分支流向与提交标题。
 * 环境变量：HEAD_REF、BASE_REF（分支名），BASE_SHA、HEAD_SHA（提交范围）。
 */
import { execFileSync } from 'node:child_process';
import {
  isValidCommitSubject,
  validatePullRequestBranches,
} from './branch-rules.js';

const { HEAD_REF, BASE_REF, BASE_SHA, HEAD_SHA } = process.env;
const errors = [];

const branchError = validatePullRequestBranches(HEAD_REF, BASE_REF);
if (branchError) errors.push(branchError);

if (BASE_SHA && HEAD_SHA) {
  const subjects = execFileSync(
    'git',
    ['log', '--format=%s', `${BASE_SHA}..${HEAD_SHA}`],
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean);
  subjects
    .filter((subject) => !isValidCommitSubject(subject))
    .forEach((subject) => errors.push(`提交标题不符合规范：${subject}`));
}

if (errors.length) {
  errors.forEach((error) => console.error(`✗ ${error}`));
  console.error('规范见 docs/git-workflow.md');
  process.exit(1);
}
console.warn(`✓ ${HEAD_REF} → ${BASE_REF} 符合分支与提交规范`);
