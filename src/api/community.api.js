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
  { size = 20, cursor } = {},
  options = {},
) {
  const page = await http.get('/community/feed/cursor', {
    ...options,
    params: { size, cursor },
  });
  return { ...page, items: page.items.map(mapPost) };
}
export async function fetchCommunityPostDetail(id, options = {}) {
  return mapPost(
    await http.get(`/community/posts/${encodeURIComponent(id)}`, options),
  );
}
export async function createCommunityPost(payload, options = {}) {
  return http.post(
    '/community/posts',
    {
      title: payload.title,
      content: payload.content,
      imageUrls: payload.imageUrls || payload.images || [],
      clientRequestId: payload.clientRequestId,
    },
    options,
  );
}
export async function fetchPostComments(id, options = {}) {
  const page = await http.get(
    `/community/posts/${encodeURIComponent(id)}/comments`,
    options,
  );
  return page.items.map(mapComment);
}
export async function createPostComment(id, payload, options = {}) {
  return http.post(
    `/community/posts/${encodeURIComponent(id)}/comments`,
    payload,
    options,
  );
}
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
