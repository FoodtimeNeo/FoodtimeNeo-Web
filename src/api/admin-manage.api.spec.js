import { expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('./http.js', async (original) => ({
  ...(await original()),
  http: api,
}));
import {
  fetchManagedItems,
  saveManagedItem,
  deleteManagedReview,
  catalogPayload,
  fetchManagedReviews,
} from './admin-manage.api.js';
it('目录字段按真实类型投影，不发送 floor、分类、菜品封面或虚构属性', async () => {
  const input = {
    parentId: 'stall',
    name: '面',
    description: null,
    price: 0,
    coverImageUrl: 'ref',
    status: 'active',
    sortOrder: 4,
    floor: 1,
    summary: 'fake',
    category: 'fake',
  };
  expect(catalogPayload('dishes', input)).toEqual({
    parentId: 'stall',
    name: '面',
    description: null,
    price: 0,
    status: 'active',
  });
  await saveManagedItem('stalls', 's', input);
  expect(api.put).toHaveBeenLastCalledWith('/admin/catalog/stalls/s', {
    parentId: 'stall',
    name: '面',
    description: null,
    coverImageUrl: 'ref',
    status: 'active',
    sortOrder: 4,
  });
  await fetchManagedItems('dishes', 2, 'stall');
  expect(api.get).toHaveBeenLastCalledWith('/admin/catalog/dishes', {
    params: { page: 2, size: 20, parentId: 'stall' },
  });
  await deleteManagedReview('r', '原因');
  expect(api.delete).toHaveBeenLastCalledWith('/admin/reviews/r', {
    data: { reason: '原因' },
  });
});
it('管理员评论查询发送用户关键词和分页，空条件查询全部', async () => {
  await fetchManagedReviews(2, ' author@bjtu.edu.cn ');
  expect(api.get).toHaveBeenLastCalledWith('/admin/reviews', {
    params: { page: 2, size: 20, q: 'author@bjtu.edu.cn' },
  });
  await fetchManagedReviews(1, '');
  expect(api.get).toHaveBeenLastCalledWith('/admin/reviews', {
    params: { page: 1, size: 20 },
  });
});
