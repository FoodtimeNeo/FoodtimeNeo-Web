import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('./http.js', async (original) => ({
  ...(await original()),
  http: api,
}));
import {
  uploadImage,
  submitDish,
  submitStall,
  submitPhoto,
} from './submission.api.js';
beforeEach(() => vi.clearAllMocks());
it('上传 multipart 文件，拒绝非本站媒体引用', async () => {
  const file = new File(['abc'], 'photo.png', { type: 'image/png' });
  api.post.mockResolvedValueOnce({ imageUrl: 'https://evil.example/image' });
  await expect(uploadImage(file)).rejects.toThrow('上传响应');
  expect(api.post.mock.calls[0][1].get('file').name).toBe('photo.png');
});
it('投稿只发送数据库已有字段，保留空参考价格', async () => {
  await submitDish('stall', {
    name: '面',
    description: null,
    price: null,
    imageUrl: '/api/v1/media/id',
    status: 'approved',
    userId: 'fake',
  });
  expect(api.post).toHaveBeenLastCalledWith('/stalls/stall/submissions', {
    name: '面',
    description: null,
    price: null,
    imageUrl: '/api/v1/media/id',
  });
  await submitStall('hall', {
    name: '面档',
    description: null,
    coverImageUrl: '/api/v1/media/id',
    floor: 1,
  });
  expect(api.post).toHaveBeenLastCalledWith('/dining-halls/hall/submissions', {
    name: '面档',
    description: null,
    coverImageUrl: '/api/v1/media/id',
  });
  await submitPhoto('dish', { imageUrl: 'ref', status: 'approved' });
  expect(api.post).toHaveBeenLastCalledWith('/dishes/dish/image-submissions', {
    imageUrl: 'ref',
  });
});
