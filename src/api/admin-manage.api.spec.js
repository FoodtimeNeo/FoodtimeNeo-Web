import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));
vi.mock('./http.js', () => ({ http: { get, post, put, delete: del } }));

import {
  deleteCanteen,
  deleteDish,
  deleteStall,
  fetchManagedCanteens,
  fetchManagedStalls,
  saveCanteen,
  saveDish,
  saveStall,
} from './admin-manage.api.js';

describe('食堂内容管理接口', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    put.mockReset();
    del.mockReset();
  });

  it('食堂和档口列表使用现有读取接口', async () => {
    await fetchManagedCanteens();
    await fetchManagedStalls('a/b');
    expect(get.mock.calls).toEqual([['/canteens'], ['/canteens/a%2Fb/stalls']]);
  });

  it('新增与编辑使用对应 POST/PUT 地址', async () => {
    await saveCanteen('', { name: '一食堂' });
    await saveCanteen('c1', { name: '一食堂' });
    await saveStall('c1', '', { name: '面档' });
    await saveStall('c1', 's1', { name: '面档' });
    await saveDish('', { name: '牛肉面' });
    await saveDish('d1', { name: '牛肉面' });
    expect(post.mock.calls).toEqual([
      ['/canteens', { name: '一食堂' }],
      ['/canteens/c1/stalls', { name: '面档' }],
      ['/dishes', { name: '牛肉面' }],
    ]);
    expect(put.mock.calls).toEqual([
      ['/canteens/c1', { name: '一食堂' }],
      ['/stalls/s1', { name: '面档' }],
      ['/dishes/d1', { name: '牛肉面' }],
    ]);
  });

  it('删除使用各资源地址', async () => {
    await deleteCanteen('c1');
    await deleteStall('s1');
    await deleteDish('d1');
    expect(del.mock.calls).toEqual([
      ['/canteens/c1'],
      ['/stalls/s1'],
      ['/dishes/d1'],
    ]);
  });
});
