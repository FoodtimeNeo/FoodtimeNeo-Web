import { http, ApiError } from './http.js';
export async function uploadAvatar(file) {
  const body = new FormData();
  body.append('file', file);
  const data = await http.post('/uploads/avatars', body);
  if (!/^\/api\/v1\/media\/[0-9a-f-]{36}$/i.test(data?.imageUrl || ''))
    throw new ApiError('头像上传响应不符合接口约定', { code: 'PROTOCOL' });
  return data;
}
export const updateOwnProfile = ({ displayName, avatarUrl }) =>
  http.put('/users/me/profile', { displayName, avatarUrl });
export const fetchOwnReviews = (page = 1, options = {}) =>
  http.get('/users/me/reviews', { ...options, params: { page, size: 20 } });
export const deleteOwnReview = (id) =>
  http.delete(`/users/me/reviews/${encodeURIComponent(id)}`);
const submissionPaths = {
  review: 'review-submissions',
  dish: 'dish-submissions',
  stall: 'stall-submissions',
  photo: 'image-submissions',
};
export function fetchOwnSubmissions(kind, page = 1, options = {}) {
  if (!submissionPaths[kind])
    throw new ApiError('未知投稿类型', { code: 'VALIDATION' });
  return http.get('/users/me/' + submissionPaths[kind], {
    ...options,
    params: { page, size: 20 },
  });
}
