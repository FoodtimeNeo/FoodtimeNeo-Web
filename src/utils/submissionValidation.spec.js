import { expect, it } from 'vitest';
import { validateImageFile, validatePrice } from './submissionValidation.js';
it('图片类型与大小界限，价格允许空值和零但拒绝负数及精度溢出', () => {
  expect(validateImageFile({ size: 10 * 1024 * 1024, type: 'image/png' })).toBe(
    '',
  );
  expect(
    validateImageFile({ size: 10 * 1024 * 1024 + 1, type: 'image/png' }),
  ).not.toBe('');
  expect(validateImageFile({ size: 100, type: 'image/svg+xml' })).not.toBe('');
  for (const value of ['', '0', '0.00', '99999999.99'])
    expect(validatePrice(value)).toBe('');
  for (const value of ['-1', '1.001', '100000000', 'NaN', '1e2'])
    expect(validatePrice(value)).not.toBe('');
  expect(validatePrice('', { required: true })).not.toBe('');
});
