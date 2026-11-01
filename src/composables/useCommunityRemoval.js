import { ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  deleteCommunityPost,
  deletePostComment,
  removeCommunityAsAdmin,
} from '@/api/community.api.js';

export function useCommunityRemoval() {
  const auth = useAuthStore();
  const removing = ref(false);
  const owner = (item) => item?.userId || item?.author?.id;
  const canRemove = (item) =>
    Boolean(
      item &&
      !item.deleted &&
      auth.user?.id &&
      (auth.isAdmin || owner(item) === auth.user.id),
    );

  async function remove(type, item) {
    if (removing.value || !canRemove(item)) return false;
    if (!['posts', 'comments'].includes(type))
      throw new Error('不支持的社区内容类型');
    const actorId = auth.user.id;
    const role = auth.user.role;
    const id = item.id;
    const administrative = auth.isAdmin && owner(item) !== actorId;
    const title = type === 'posts' ? '删除帖子' : '删除评论';
    removing.value = true;
    try {
      let reason;
      try {
        if (administrative) {
          const result = await ElMessageBox.prompt(
            '请输入删除原因（1–500字）。删除后内容将从社区隐藏。',
            title,
            {
              type: 'warning',
              inputType: 'textarea',
              inputValidator: (value) =>
                (Boolean(value?.trim()) && value.trim().length <= 500) ||
                '请填写1–500字的删除原因',
            },
          );
          reason = result.value.trim();
          if (!reason || reason.length > 500)
            throw new Error('请填写1–500字的删除原因');
        } else {
          await ElMessageBox.confirm(
            type === 'posts'
              ? '删除后无法恢复，帖子将从社区隐藏。'
              : '删除后无法恢复，已通过的楼内回复会保留。',
            title,
            { type: 'warning' },
          );
        }
      } catch (error) {
        if (error === 'cancel' || error === 'close') return false;
        throw error;
      }
      if (auth.user?.id !== actorId || auth.user?.role !== role)
        throw new Error('登录状态已变化，请重新操作');
      if (administrative) await removeCommunityAsAdmin(type, id, reason);
      else if (type === 'posts') await deleteCommunityPost(id);
      else await deletePostComment(id);
      return true;
    } finally {
      removing.value = false;
    }
  }
  return { canRemove, remove, removing };
}
