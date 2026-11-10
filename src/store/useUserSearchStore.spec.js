import { beforeEach, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserSearchStore } from './useUserSearchStore.js';
beforeEach(() => setActivePinia(createPinia()));
it('同账号返回保留草稿，身份和角色变化清理草稿', () => {
  const store = useUserSearchStore();
  store.bind({ id: 'one', role: 'user' });
  store.query = '小李';
  store.bind({ id: 'one', role: 'user' });
  expect(store.query).toBe('小李');
  store.bind({ id: 'two', role: 'user' });
  expect(store.query).toBe('');
  store.query = '小王';
  store.bind({ id: 'two', role: 'visitor' });
  expect(store.query).toBe('');
  store.query = '小赵';
  store.clear();
  expect(store.query).toBe('');
});
