import { expect, it } from 'vitest';
import { readFeedbackCsv } from './feedback.js';
it('UTF-8 CSV 能保留中文、引号和多行内容', async () => {
  const csv = '\uFEFF反馈编号,反馈内容\r\n1,"中文😊\n第二行"\r\n';
  const bytes = new TextEncoder().encode(csv);
  expect(
    await readFeedbackCsv({
      name: '回复.csv',
      size: bytes.length,
      arrayBuffer: async () => bytes.buffer,
    }),
  ).toBe(csv.substring(1));
});
it('拒绝其他文件、过大文件及无效 UTF-8，避免乱码映射', async () => {
  await expect(readFeedbackCsv({ name: '回复.xlsx', size: 1 })).rejects.toThrow(
    'CSV',
  );
  await expect(
    readFeedbackCsv({ name: '回复.csv', size: 8000001 }),
  ).rejects.toThrow('文件过大');
  await expect(
    readFeedbackCsv({
      name: '回复.csv',
      size: 2,
      arrayBuffer: async () => new Uint8Array([255, 255]).buffer,
    }),
  ).rejects.toThrow('编码不正确');
});
