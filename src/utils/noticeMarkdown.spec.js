import { expect, it } from 'vitest';
import { renderNoticeMarkdown } from './noticeMarkdown.js';
it('支持标题、引用、列表、代码和表格', () => {
  const html = renderNoticeMarkdown(
    '# 标题\n\n> 引用\n\n1. 列表\n\n    code\n\n| A | B |\n|---|---|\n| 1 | 2 |',
  );
  expect(html).toContain('<h1>标题</h1>');
  expect(html).toContain('<blockquote>');
  expect(html).toContain('<ol>');
  expect(html).toContain('<table>');
});
it('原始 HTML 和危险链接不执行，正常 HTTPS 链接可用', () => {
  const html = renderNoticeMarkdown(
    '<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n[正常](https://example.com)\n\n![x](file:///secret)',
  );
  const node = document.createElement('div');
  node.innerHTML = html;
  expect(node.querySelector('script')).toBeNull();
  expect(node.querySelector('[href^="javascript:"]')).toBeNull();
  expect(node.querySelector('[src^="file:"]')).toBeNull();
  expect(node.querySelector('a').href).toBe('https://example.com/');
});

import { noticeHeading } from './noticeMarkdown.js';
it('提取最上级第一个标题，忽略代码块并移除行内标记', () => {
  expect(
    noticeHeading(
      '```md\n# 假标题\n```\n\n## 次级\n\n# **最高** [链接](https://example.com)\n\n# 第二个',
    ),
  ).toBe('最高 链接');
  expect(noticeHeading('Setext 标题\n===')).toBe('Setext 标题');
  expect(noticeHeading('没有标题')).toBe('');
});
