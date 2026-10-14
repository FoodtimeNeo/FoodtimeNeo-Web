import { http, ApiError } from './http.js';
export async function uploadImage(file) {
  const body = new FormData();
  body.append('file', file);
  const data = await http.post('/uploads/images', body);
  if (!/^\/api\/v1\/media\/[0-9a-f-]{36}$/i.test(data?.imageUrl || ''))
    throw new ApiError('上传响应不符合接口约定', { code: 'PROTOCOL' });
  return data;
}
export const submitPhoto = (id, { imageUrl }) =>
  http.post('/dishes/' + encodeURIComponent(id) + '/image-submissions', {
    imageUrl,
  });
export const submitDish = (id, { name, description, price, imageUrl }) =>
  http.post('/stalls/' + encodeURIComponent(id) + '/submissions', {
    name,
    description,
    price,
    imageUrl,
  });
export const submitStall = (id, { name, description, coverImageUrl }) =>
  http.post('/dining-halls/' + encodeURIComponent(id) + '/submissions', {
    name,
    description,
    coverImageUrl,
  });
