export const communityMessageCategories = [
  'LIKE_POST',
  'LIKE_COMMENT',
  'COMMENT_POST',
  'REPLY_COMMENT',
];

/** 互动消息只跳社区帖详情；其他系统消息仍按普通消息展示。 */
export function isCommunityMessage(row) {
  return Boolean(
    row?.refId &&
    row.refType === 'community-post' &&
    communityMessageCategories.includes(row.category),
  );
}

/** 返回路由目标；根评论/回复用 query 携带定位信息。 */
export function communityMessageTarget(row) {
  if (!isCommunityMessage(row)) return null;
  const query = {};
  if (row.refCommentId) query.comment = row.refCommentId;
  if (row.refRootCommentId) query.root = row.refRootCommentId;
  return {
    name: 'communityDetail',
    params: { postId: row.refId },
    query,
  };
}
