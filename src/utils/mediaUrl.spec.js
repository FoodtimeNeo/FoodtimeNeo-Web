import { describe, expect, it } from 'vitest';
import { safeMediaUrl, formatPrice } from './mediaUrl.js';
describe('图片来源与真实金额', () => {
  const origin = 'http://127.0.0.1:5173';
  it('存储引用保持同站；拒绝可执行URL、协议相对地址和其他本机服务', () => {
    const ref = '/api/v1/media/00000000-0000-4000-8000-000000000001';
    expect(safeMediaUrl(ref, origin)).toBe(ref);
    [
      'javascript:alert(1)',
      'data:image/svg+xml,evil',
      '//evil.example/image',
      'http://127.0.0.1:8081/image',
      '/auth/logout',
    ].forEach((url) => expect(safeMediaUrl(url, origin)).toBe(''));
    expect(safeMediaUrl('https://images.example.com/old.jpg', origin)).toBe(
      'https://images.example.com/old.jpg',
    );
  });
  it('零价格不是缺失值；金额固定两位', () => {
    expect(formatPrice(0)).toBe('¥0.00');
    expect(formatPrice('12.3')).toBe('¥12.30');
    expect(formatPrice(null)).toBe('价格未填写');
  });
});
