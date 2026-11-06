import { describe, expect, it } from 'vitest';
import { communityMessageTarget, isCommunityMessage } from './messageLinks.js';

describe('community message links', () => {
  const base = {
    refType: 'community-post',
    refId: 'post-1',
    category: 'LIKE_POST',
  };

  it('互动消息生成带定位参数的原帖路由', () => {
    expect(communityMessageTarget(base)).toEqual({
      name: 'communityDetail',
      params: { postId: 'post-1' },
      query: {},
    });
    expect(
      communityMessageTarget({
        ...base,
        category: 'REPLY_COMMENT',
        refCommentId: 'reply-2',
        refRootCommentId: 'root-1',
      }),
    ).toEqual({
      name: 'communityDetail',
      params: { postId: 'post-1' },
      query: { comment: 'reply-2', root: 'root-1' },
    });
  });

  it('普通系统消息不跳转原帖', () => {
    expect(isCommunityMessage({ ...base, category: 'SYSTEM' })).toBe(false);
    expect(isCommunityMessage({ ...base, refType: null })).toBe(false);
    expect(isCommunityMessage({ ...base, refId: null })).toBe(false);
    expect(communityMessageTarget({ ...base, category: 'SYSTEM' })).toBeNull();
  });
});
