import { http, ApiError } from './http.js';
function snapshot(value) {
  if (
    !Number.isSafeInteger(value?.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.items) ||
    value.items.length > 3 ||
    typeof value.canManage !== 'boolean'
  )
    throw new ApiError('置顶列表响应异常，请刷新后重试', { code: 'PROTOCOL' });
  const ids = new Set(),
    slots = new Set();
  for (const row of value.items) {
    if (
      !row?.id ||
      typeof row.title !== 'string' ||
      !['pending', 'approved', 'rejected'].includes(row.status) ||
      !Number.isInteger(row.position) ||
      row.position < 1 ||
      row.position > 3 ||
      ids.has(row.id) ||
      slots.has(row.position)
    )
      throw new ApiError('置顶记录响应异常', { code: 'PROTOCOL' });
    ids.add(row.id);
    slots.add(row.position);
  }
  return value;
}
const root = '/admin/community/pins';
export const fetchManagedPins = async (options = {}) =>
  snapshot(await http.get(root, options));
export const pinPost = async (id, expectedRevision, options = {}) =>
  snapshot(
    await http.put(
      `${root}/${encodeURIComponent(id)}`,
      { expectedRevision },
      options,
    ),
  );
export const unpinPost = async (id, expectedRevision, options = {}) =>
  snapshot(
    await http.delete(`${root}/${encodeURIComponent(id)}`, {
      ...options,
      params: { expectedRevision },
    }),
  );
export const reorderPins = async (postIds, expectedRevision, options = {}) =>
  snapshot(
    await http.put(`${root}/order`, { postIds, expectedRevision }, options),
  );
