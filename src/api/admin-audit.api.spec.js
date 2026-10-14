import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('./http.js', () => ({ http: { get, put } }));

import { fetchAuditItems, submitAudit } from './admin-audit.api.js';

describe('管理审核接口', () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
  });

  it('从投稿响应的 items 读取待审列表', async () => {
    get.mockResolvedValue({ items: [{ id: 's1' }], total: 1 });
    await expect(fetchAuditItems('submissions')).resolves.toEqual([
      { id: 's1' },
    ]);
    expect(get).toHaveBeenCalledWith('/submissions');
  });

  it('点评和吐槽使用各自的管理列表地址', async () => {
    get.mockResolvedValue([]);
    await fetchAuditItems('reviews');
    await fetchAuditItems('rants');
    expect(get.mock.calls).toEqual([['/reviews/admin'], ['/rants']]);
  });

  it('审核请求向后端传状态和意见，投稿附带审核员账号', async () => {
    await submitAudit('submissions', 's1', 'rejected', '信息不完整', 'admin');
    await submitAudit('reviews', 'r1', 'approved', '内容真实', 'admin');
    expect(put.mock.calls).toEqual([
      [
        '/submissions/s1/audit',
        { status: 'rejected', reason: '信息不完整', auditor: 'admin' },
      ],
      ['/reviews/r1/audit', { status: 'approved', reason: '内容真实' }],
    ]);
  });
});
