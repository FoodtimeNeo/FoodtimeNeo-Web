import { describe, expect, it } from 'vitest';
import { draftKey, isBlankDraft } from './postDraft.js';

describe('本机发帖草稿规则', () => {
  it('按服务地址与账号 UUID 隔离，不依赖邮箱', () => {
    expect(draftKey('https://a.example', 'uuid-1')).toBe(
      'https://a.example::uuid-1',
    );
    expect(draftKey('https://a.example', 'uuid-2')).not.toBe(
      draftKey('https://a.example', 'uuid-1'),
    );
  });

  it('空白标题、正文和图片不生成草稿', () => {
    expect(isBlankDraft({ title: ' ', content: '\n', images: [] })).toBe(true);
    expect(isBlankDraft({ title: '标题', content: '', images: [] })).toBe(
      false,
    );
    expect(isBlankDraft({ title: '', content: '', images: [{}] })).toBe(false);
  });
});
