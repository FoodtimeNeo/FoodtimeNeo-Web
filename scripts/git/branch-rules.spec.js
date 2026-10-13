import { describe, expect, it } from 'vitest';
import {
  FEATURE_NAME_PATTERN,
  isValidCommitSubject,
  validatePullRequestBranches,
} from './branch-rules.js';

describe('validatePullRequestBranches', () => {
  it.each([
    ['feature/canteen-list', 'develop'],
    ['fix/login-redirect', 'develop'],
    ['hotfix/blank-page', 'develop'],
    ['develop', 'main'],
    ['hotfix/blank-page', 'main'],
  ])('允许 %s → %s', (head, base) => {
    expect(validatePullRequestBranches(head, base)).toBeNull();
  });

  it.each([
    ['feature/canteen-list', 'main'],
    ['feat/canteen-list', 'develop'],
    ['feature/CanteenList', 'develop'],
    ['feature-canteen', 'develop'],
    ['develop', 'feature/x'],
  ])('拒绝 %s → %s', (head, base) => {
    expect(validatePullRequestBranches(head, base)).toEqual(expect.any(String));
  });
});

describe('isValidCommitSubject', () => {
  it.each([
    'feat(canteen): 实现食堂列表',
    'fix: 修复登录跳转',
    'refactor(api)!: 统一错误结构',
    'Merge pull request #3 from FoodtimeNeo/feature/x',
    'Revert "feat: 实现食堂列表"',
  ])('通过 %s', (subject) => {
    expect(isValidCommitSubject(subject)).toBe(true);
  });

  it.each([
    'update',
    'feat:没有空格',
    'Feat: 大写类型',
    `feat: ${'长'.repeat(80)}`,
  ])('拒绝 %s', (subject) => {
    expect(isValidCommitSubject(subject)).toBe(false);
  });
});

describe('FEATURE_NAME_PATTERN', () => {
  it('只接受 kebab-case', () => {
    expect(FEATURE_NAME_PATTERN.test('dish-gallery')).toBe(true);
    expect(FEATURE_NAME_PATTERN.test('Dish_Gallery')).toBe(false);
  });
});
