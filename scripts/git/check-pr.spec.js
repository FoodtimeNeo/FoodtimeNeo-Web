// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('./check-pr.js', import.meta.url));
let repository;
let main;
let develop;
let feature;
let invalidFeature;
let hotfix;

function git(...args) {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
    cwd: repository,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function check(overrides = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: repository,
    encoding: 'utf8',
    env: {
      ...process.env,
      HEAD_REF: 'feature/test',
      BASE_REF: 'develop',
      BASE_SHA: develop,
      HEAD_SHA: feature,
      PR_TITLE: 'fix(ci): 校验新提交',
      ...overrides,
    },
  });
}

beforeAll(() => {
  repository = mkdtempSync(join(tmpdir(), 'foodtimeneo-git-rules-'));
  git('init', '--quiet');
  git('config', 'user.name', 'Git rules test');
  git('config', 'user.email', 'git-rules@example.test');
  const tree = execFileSync('git', ['mktree'], {
    cwd: repository,
    input: '',
    encoding: 'utf8',
  }).trim();
  const root = git('commit-tree', tree, '-m', 'chore: 初始化仓库');
  main = git('commit-tree', tree, '-p', root, '-m', 'Legacy release title');
  develop = git('commit-tree', tree, '-p', root, '-m', 'Legacy develop title');
  feature = git(
    'commit-tree',
    tree,
    '-p',
    develop,
    '-m',
    'fix(ci): 校验新提交',
  );
  invalidFeature = git(
    'commit-tree',
    tree,
    '-p',
    develop,
    '-m',
    'bad new title',
  );
  hotfix = git(
    'commit-tree',
    tree,
    '-p',
    feature,
    '-p',
    main,
    '-m',
    'chore(release): 同步发布历史',
  );
  git('update-ref', 'refs/remotes/origin/main', main);
  git('update-ref', 'refs/remotes/origin/develop', develop);
}, 30000);

afterAll(() => {
  if (
    repository &&
    resolve(dirname(repository)) === resolve(tmpdir()) &&
    basename(repository).startsWith('foodtimeneo-git-rules-')
  ) {
    rmSync(repository, { recursive: true, force: true });
  }
});

describe('PR 提交校验', () => {
  it('发布时不重复校验 develop 中已有的历史标题', () => {
    const result = check({
      HEAD_REF: 'develop',
      BASE_REF: 'main',
      BASE_SHA: main,
      HEAD_SHA: develop,
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it('允许携带旧历史的规范功能提交', () => {
    const result = check();
    expect(result.status, result.stderr).toBe(0);
  });

  it('仍然拒绝尚未进入主分支的不规范提交', () => {
    const result = check({ HEAD_SHA: invalidFeature });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('bad new title');
  });

  it('热修复同步 main 历史后仍检查新提交', () => {
    const result = check({
      HEAD_REF: 'hotfix/release-integration',
      HEAD_SHA: hotfix,
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it('即使没有新提交也拒绝不规范的 PR 标题', () => {
    const result = check({
      HEAD_REF: 'develop',
      BASE_REF: 'main',
      BASE_SHA: main,
      HEAD_SHA: develop,
      PR_TITLE: 'release update',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PR 标题不符合规范');
  });

  it('拒绝不符合规范的分支流向', () => {
    const result = check({ BASE_REF: 'main', BASE_SHA: main });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('只有 develop 或 hotfix/<name>');
  });
});
