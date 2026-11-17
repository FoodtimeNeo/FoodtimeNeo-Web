import { http } from './http.js';
export function mapPost(post) {
  return {
    ...post,
    author: {
      id: post.userId,
      name: post.userDisplayName,
      avatar: post.userAvatarUrl,
    },
    images: post.images?.length
      ? post.images
      : (post.imageUrls || []).map((url) => ({ url })),
  };
}
export function mapComment(comment) {
  return {
    ...comment,
    author: {
      id: comment.userId,
      name: comment.userDisplayName,
      avatar: comment.userAvatarUrl,
    },
  };
}
export async function fetchCommunityPosts(
  { size = 20, cursor, following, q, pinRevision } = {},
  options = {},
) {
  const page = await http.get('/community/feed/cursor', {
    ...options,
    params: {
      size,
      cursor,
      ...(following ? { following } : {}),
      ...(q ? { q } : {}),
      ...(Number.isSafeInteger(pinRevision) ? { pinRevision } : {}),
    },
  });
  return { ...page, items: page.items.map(mapPost) };
}
export const fetchCommunityAuthor = (id, options = {}) =>
  http.get(`/community/authors/${encodeURIComponent(id)}`, options);
export async function fetchAuthorPosts(id, { cursor } = {}, options = {}) {
  const page = await http.get(
    `/community/authors/${encodeURIComponent(id)}/posts`,
    { ...options, params: { size: 20, cursor } },
  );
  return { ...page, items: page.items.map(mapPost) };
}
export async function fetchCommunityPostDetail(id, options = {}) {
  return mapPost(
    await http.get(`/community/posts/${encodeURIComponent(id)}`, options),
  );
}
export const recordPostView = (id, clientRequestId) =>
  http.post(`/community/posts/${encodeURIComponent(id)}/views`, {
    clientRequestId,
  });
export async function createCommunityPost(payload, options = {}) {
  return http.post(
    '/community/posts',
    {
      title: payload.title,
      content: payload.content,
      imageUrls: payload.imageUrls || payload.images || [],
      clientRequestId: payload.clientRequestId,
      ...(payload.dishId ? { dishId: payload.dishId } : {}),
    },
    options,
  );
}
export const editCommunityPost = (id, payload, options = {}) =>
  http.put(
    `/community/posts/${encodeURIComponent(id)}`,
    {
      title: payload.title,
      content: payload.content,
      imageUrls: payload.images || [],
      dishId: payload.dishId || null,
      expectedRevision: payload.expectedRevision,
      clientRequestId: payload.clientRequestId,
    },
    options,
  );

export async function fetchPostComments(id, options = {}) {
  const page = await http.get(
    `/community/posts/${encodeURIComponent(id)}/comments`,
    options,
  );
  return page.items.map(mapComment);
}
export async function createPostComment(id, payload, options = {}) {
  // 后端返回创建后的评论（含 status），客户端可立即展示"审核中"。
  return mapComment(
    await http.post(
      `/community/posts/${encodeURIComponent(id)}/comments`,
      payload,
      options,
    ),
  );
}
export const fetchCommentStatus = (commentId, options = {}) =>
  http.get(
    `/community/comments/${encodeURIComponent(commentId)}/status`,
    options,
  );
export async function fetchMyCommunityPosts(params = {}) {
  const page = await http.get('/users/me/community-posts', { params });
  return { ...page, items: page.items.map(mapPost) };
}
export const deleteCommunityPost = (id) =>
  http.delete(`/community/posts/${encodeURIComponent(id)}`);

export async function fetchRootComments(id, params = {}) {
  const page = await http.get(
    `/community/posts/${encodeURIComponent(id)}/comments/cursor`,
    { params },
  );
  return { ...page, items: page.items.map(mapComment) };
}
export async function fetchCommentReplies(id, root, params = {}) {
  const page = await http.get(
    `/community/posts/${encodeURIComponent(id)}/comments/${encodeURIComponent(root)}/replies`,
    { params },
  );
  return { ...page, items: page.items.map(mapComment) };
}
export const deletePostComment = (id) =>
  http.delete(`/community/comments/${encodeURIComponent(id)}`);

export const setPostLike = (id, liked) =>
  http[liked ? 'put' : 'delete'](
    `/community/posts/${encodeURIComponent(id)}/like`,
  );
export const setCommentLike = (id, liked) =>
  http[liked ? 'put' : 'delete'](
    `/community/comments/${encodeURIComponent(id)}/like`,
  );
export const setPostFavorite = (id, favorite) =>
  http[favorite ? 'put' : 'delete'](
    `/community/posts/${encodeURIComponent(id)}/favorite`,
  );
export async function fetchMyCommunityFavorites(params = {}) {
  const page = await http.get('/users/me/community-favorites', { params });
  return { ...page, items: page.items.map(mapPost) };
}

export async function fetchCommunityAudit(
  type,
  status,
  page = 1,
  options = {},
) {
  return http.get(`/admin/community/${type}`, {
    ...options,
    params: { status, page, size: 20 },
  });
}
export const fetchCommunityAuditDetail = (type, id, options = {}) =>
  http.get(`/admin/community/${type}/${encodeURIComponent(id)}`, options);
export const submitCommunityAudit = (type, id, body) =>
  http.post(`/admin/community/${type}/${encodeURIComponent(id)}`, body);
export const removeCommunityAsAdmin = (type, id, reason = undefined) =>
  http.delete(`/admin/community/${type}/${encodeURIComponent(id)}`, {
    data: reason ? { reason } : undefined,
  });
