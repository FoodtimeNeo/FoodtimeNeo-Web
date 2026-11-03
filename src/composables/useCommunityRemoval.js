import { h, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  deleteCommunityPost,
  deletePostComment,
  removeCommunityAsAdmin,
  fetchCommunityPostDetail,
  fetchRootComments,
  fetchCommentReplies,
} from '@/api/community.api.js';

async function invisible(type, item) {
  try {
    if (type === 'posts') {
      await fetchCommunityPostDetail(item.id);
      return false;
    }
    if (!item.postId) throw new Error('请关闭对话框并刷新评论，确认操作结果。');
    await fetchCommunityPostDetail(item.postId);
    let cursor;
    for (let page = 0; page < 100; page++) {
      const result = item.rootCommentId
        ? await fetchCommentReplies(item.postId, item.rootCommentId, {
            size: 100,
            cursor,
          })
        : await fetchRootComments(item.postId, { size: 100, cursor });
      const found = result.items.find((row) => row.id === item.id);
      if (found) return Boolean(found.deleted);
      if (!result.hasMore) return true;
      cursor = result.nextCursor;
    }
    throw new Error('讨论较长，请关闭对话框并刷新评论确认结果。');
  } catch (error) {
    if (error.bizCode === 'CONTENT_NOT_FOUND') return true;
    throw error;
  }
}
export function useCommunityRemoval() {
  const auth = useAuthStore(),
    removing = ref(false),
    outcome = ref('');
  const owner = (item) => item?.userId || item?.author?.id;
  const canRemove = (item) =>
    Boolean(
      item &&
      !item.deleted &&
      auth.user?.id &&
      (auth.isAdmin || owner(item) === auth.user.id),
    );
  async function remove(type, item, { isCurrent = () => true } = {}) {
    if (removing.value || !canRemove(item)) return false;
    if (!['posts', 'comments'].includes(type))
      throw new Error('不支持的社区内容类型');
    const actorId = auth.user.id,
      role = auth.user.role,
      id = item.id;
    const administrative = auth.isAdmin && owner(item) !== actorId;
    const error = ref(''),
      uncertain = ref(false);
    let pending = false,
      finished = false;
    outcome.value = '';
    removing.value = true;
    const valid = () =>
      auth.user?.id === actorId &&
      auth.user?.role === role &&
      canRemove(item) &&
      isCurrent();
    try {
      await ElMessageBox.confirm(
        () =>
          h('div', [
            h(
              'p',
              { class: 'community-delete-summary' },
              String(
                item.title ||
                  item.content ||
                  (type === 'posts' ? '这篇食记' : '这条评论'),
              ).slice(0, 160),
            ),
            h(
              'p',
              type === 'posts'
                ? '帖子将从社区隐藏，相关讨论将无法访问。此操作无法在客户端撤销。'
                : item.rootCommentId
                  ? '仅删除这条回复，其他讨论不受影响。'
                  : '删除后无法在客户端撤销，已通过的楼内回复会保留。',
            ),
            error.value
              ? h(
                  'p',
                  { role: 'alert', style: { color: 'var(--ft-color-danger)' } },
                  error.value,
                )
              : null,
          ]),
        type === 'posts' ? '删除帖子' : '删除评论',
        {
          type: 'warning',
          zIndex: 11020,
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          closeOnClickModal: false,
          closeOnPressEscape: false,
          showClose: false,
          beforeClose: async (action, instance, done) => {
            if (pending) return;
            if (action !== 'confirm') {
              done();
              return;
            }
            if (!valid()) {
              error.value = '登录状态或当前内容已变化，请取消后重新操作。';
              instance.confirmButtonDisabled = true;
              return;
            }
            pending = true;
            instance.confirmButtonLoading = true;
            instance.cancelButtonLoading = true;
            instance.confirmButtonText = uncertain.value
              ? '确认结果中…'
              : '删除中…';
            try {
              if (uncertain.value) {
                if (!(await invisible(type, item))) {
                  uncertain.value = false;
                  error.value = '内容仍然可见。可以重新确认删除。';
                  return;
                }
                outcome.value = 'missing';
              } else {
                if (administrative) await removeCommunityAsAdmin(type, id);
                else if (type === 'posts') await deleteCommunityPost(id);
                else await deletePostComment(id);
                outcome.value = 'deleted';
              }
              finished = true;
              instance.action = 'confirm';
              done();
            } catch (failure) {
              if (failure.bizCode === 'CONTENT_NOT_FOUND') {
                outcome.value = 'missing';
                finished = true;
                instance.action = 'confirm';
                done();
                return;
              }
              uncertain.value =
                ['NETWORK', 'TIMEOUT'].includes(failure.code) ||
                failure.status >= 500;
              error.value = uncertain.value
                ? '结果暂未确认，请刷新确认结果，避免重复删除。'
                : failure.message || '删除失败，请重试。';
            } finally {
              pending = false;
              instance.confirmButtonLoading = false;
              instance.cancelButtonLoading = false;
              instance.confirmButtonText = uncertain.value
                ? '刷新确认结果'
                : '确认删除';
            }
          },
        },
      );
      return finished;
    } catch (error) {
      if (error === 'cancel' || error === 'close') return false;
      throw error;
    } finally {
      removing.value = false;
    }
  }
  return { canRemove, remove, removing, outcome };
}
