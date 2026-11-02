import { describe, expect, it } from 'vitest';
import {
  MAX_AVATAR_BYTES,
  validateAvatarFile,
  readAvatarDimensions,
  cropGeometry,
} from './avatarCrop.js';
function png(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], 'avatar.png', { type: 'image/png' });
}
describe('头像输入与方形裁剪边界', () => {
  it('原图10MB包含边界，超限与不支持格式均拒绝', () => {
    expect(
      validateAvatarFile(
        new File([new Uint8Array(MAX_AVATAR_BYTES)], 'a.png', {
          type: 'image/png',
        }),
      ),
    ).toBe('');
    expect(
      validateAvatarFile(
        new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'a.png', {
          type: 'image/png',
        }),
      ),
    ).toContain('10MB');
    expect(
      validateAvatarFile(new File(['gif'], 'a.gif', { type: 'image/gif' })),
    ).toContain('JPEG');
  });
  it('在解码前读取真实图片尺寸，拒绝伪造格式与像素炸弹', async () => {
    await expect(readAvatarDimensions(png(512, 256))).resolves.toEqual({
      width: 512,
      height: 256,
    });
    await expect(readAvatarDimensions(png(5000, 5000))).rejects.toThrow(
      '2000万',
    );
    await expect(
      readAvatarDimensions(
        new File(['<svg/>'], 'fake.png', { type: 'image/png' }),
      ),
    ).rejects.toThrow('可读取');
  });
  it.each([
    [1600, 900],
    [900, 1600],
    [512, 512],
  ])('图片%s×%s在旋转、缩放和任意拖动后仍覆盖选框', (width, height) => {
    for (const rotation of [0, 90, 180, 270])
      for (const zoom of [1, 2, 4])
        for (const pan of [-100000, 100000]) {
          const g = cropGeometry(width, height, rotation, zoom, pan, -pan);
          const w = rotation % 180 ? height : width,
            h = rotation % 180 ? width : height;
          expect(320 + g.panX - (w * g.scale) / 2).toBeLessThanOrEqual(
            g.x + 0.001,
          );
          expect(320 + g.panX + (w * g.scale) / 2).toBeGreaterThanOrEqual(
            g.x + g.side - 0.001,
          );
          expect(280 + g.panY - (h * g.scale) / 2).toBeLessThanOrEqual(
            g.y + 0.001,
          );
          expect(280 + g.panY + (h * g.scale) / 2).toBeGreaterThanOrEqual(
            g.y + g.side - 0.001,
          );
        }
  });
});
