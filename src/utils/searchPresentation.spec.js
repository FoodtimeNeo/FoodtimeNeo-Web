import { expect, it } from 'vitest';
import { previewColumns, distanceLabel } from './searchPresentation.js';
it('普通手机展示约四道，窄屏和宽屏分别限制数量', () => {
  expect(previewColumns(348)).toBe(4);
  expect(previewColumns(200)).toBe(2);
  expect(previewColumns(760)).toBe(6);
});
it('距离明确标为直线，未知值不伪造为零', () => {
  expect(distanceLabel(null)).toBe('');
  expect(distanceLabel(0)).toBe('直线 <100m');
  expect(distanceLabel(352)).toBe('直线 350m');
  expect(distanceLabel(1310)).toBe('直线 1.3km');
});
