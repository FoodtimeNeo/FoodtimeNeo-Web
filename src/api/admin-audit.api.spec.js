import { expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./http.js', async (original) => ({
  ...(await original()),
  http: api,
}));
import {
  fetchAuditItems,
  submitAudit,
  fetchModerationLogs,
} from './admin-audit.api.js';
it('统一四类审核路径不提交审核人或状态', async () => {
  await fetchAuditItems('rejected', 2);
  expect(api.get).toHaveBeenLastCalledWith('/admin/moderation', {
    params: { status: 'rejected', page: 2, size: 20 },
  });
  await submitAudit('photo', 'p', {
    action: 'reject',
    reason: '模糊',
    auditor: 'fake',
    status: 'approved',
    price: 1,
  });
  expect(api.post).toHaveBeenLastCalledWith('/admin/moderation/photo/p', {
    action: 'reject',
    reason: '模糊',
  });
  await submitAudit('dish', 'd', { action: 'approve', reason: null, price: 0 });
  expect(api.post).toHaveBeenLastCalledWith('/admin/moderation/dish/d', {
    action: 'approve',
    reason: null,
    price: 0,
  });
  expect(() => submitAudit('rants', 'x', { action: 'approve' })).toThrow(
    '参数',
  );
  await fetchModerationLogs(3);
  expect(api.get).toHaveBeenLastCalledWith('/admin/moderation/logs', {
    params: { page: 3, size: 20 },
  });
});
