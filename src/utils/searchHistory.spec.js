import { afterEach, expect, it, vi } from 'vitest';
import {
  readSearchHistory,
  rememberSearch,
  removeSearch,
  purgeSearchHistory,
} from './searchHistory.js';
afterEach(() => {
  for (const id of ['a', 'b', 'bad', 'blocked']) purgeSearchHistory(id);
  vi.restoreAllMocks();
});
it('只保留十条，重复移到首位，账号隔离，支持删除与注销清理', () => {
  for (let i = 0; i < 12; i++) rememberSearch('a', `面${i}`);
  expect(readSearchHistory('a')).toHaveLength(10);
  expect(readSearchHistory('a')).not.toContain('面0');
  rememberSearch('a', ' 面5 ');
  expect(readSearchHistory('a')[0]).toBe('面5');
  expect(readSearchHistory('b')).toEqual([]);
  expect(removeSearch('a', '面5')).not.toContain('面5');
  purgeSearchHistory('a');
  expect(readSearchHistory('a')).toEqual([]);
  expect(rememberSearch('', '私密词')).toEqual([]);
});
it('损坏的存储和存储被禁用不阻断搜索，纯文本保存不执行输入', () => {
  localStorage.setItem('foodtime:dish-search:bad', '{broken');
  expect(readSearchHistory('bad')).toEqual([]);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  rememberSearch('blocked', '<img onerror=alert(1)>');
  expect(readSearchHistory('blocked')).toEqual(['<img onerror=alert(1)>']);
});
