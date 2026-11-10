import { ElMessage, ElMessageBox } from 'element-plus';

export async function shareCommunityPost(postId) {
  if (!postId) return;
  const url = new URL(
    `/community/posts/${encodeURIComponent(postId)}`,
    window.location.origin,
  ).href;
  if (navigator.share) {
    try {
      await navigator.share({ title: '北交干饭吧 · 校园食记', url });
      return;
    } catch (failure) {
      if (failure.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success('已复制帖子链接');
  } catch {
    await ElMessageBox.prompt('复制链接即可分享此帖。', '分享帖子', {
      inputValue: url,
      confirmButtonText: '完成',
      showCancelButton: false,
    }).catch(() => {});
  }
}
