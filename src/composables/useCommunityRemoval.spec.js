import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useCommunityRemoval } from './useCommunityRemoval.js';

const api = vi.hoisted(() => ({
  deleteCommunityPost: vi.fn(),
  deletePostComment: vi.fn(),
  removeCommunityAsAdmin: vi.fn(),
}));
const dialogs = vi.hoisted(() => ({ prompt: vi.fn(), confirm: vi.fn() }));
vi.mock('@/api/community.api.js', () => api);
vi.mock('element-plus', () => ({ ElMessageBox: dialogs }));
const post = { id: 'post', userId: 'author' };

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  dialogs.confirm.mockResolvedValue('confirm');
  dialogs.prompt.mockResolvedValue({ value: '  违反社区规范  ' });
});
function login(role = 'user', id = 'viewer') {
  useAuthStore().user = { id, role };
}

describe('社区内容删除权限与确认', () => {
  it.each(['admin', 'superadmin'])(
    '%s 可以带原因删除他人帖子与评论',
    async (role) => {
      login(role);
      const removal = useCommunityRemoval();
      expect(removal.canRemove(post)).toBe(true);
      for (const type of ['posts', 'comments']) {
        expect(await removal.remove(type, post)).toBe(true);
        expect(api.removeCommunityAsAdmin).toHaveBeenLastCalledWith(
          type,
          'post',
          '违反社区规范',
        );
      }
      expect(api.deleteCommunityPost).not.toHaveBeenCalled();
      expect(api.deletePostComment).not.toHaveBeenCalled();
      expect(dialogs.prompt).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
        }),
      );
    },
  );

  it('普通用户不能操作他人内容，游客不显示删除', async () => {
    const removal = useCommunityRemoval();
    expect(removal.canRemove(post)).toBe(false);
    login();
    expect(await removal.remove('posts', post)).toBe(false);
    expect(dialogs.confirm).not.toHaveBeenCalled();
    expect(dialogs.prompt).not.toHaveBeenCalled();
  });

  it.each(['user', 'admin', 'superadmin'])(
    '%s 删除本人内容保持作者接口',
    async (role) => {
      login(role, 'author');
      const removal = useCommunityRemoval();
      await removal.remove('posts', post);
      await removal.remove('comments', post);
      expect(api.deleteCommunityPost).toHaveBeenCalledWith('post');
      expect(api.deletePostComment).toHaveBeenCalledWith('post');
      expect(dialogs.prompt).not.toHaveBeenCalled();
    },
  );

  it('取消删除不发送请求，已删除内容不能重复操作', async () => {
    login('admin');
    dialogs.prompt.mockRejectedValue('cancel');
    const removal = useCommunityRemoval();
    expect(await removal.remove('posts', post)).toBe(false);
    expect(removal.removing.value).toBe(false);
    expect(removal.canRemove({ ...post, deleted: true })).toBe(false);
    expect(api.removeCommunityAsAdmin).not.toHaveBeenCalled();
  });

  it('空白和超过500字的原因阻止提交', async () => {
    login('admin');
    const removal = useCommunityRemoval();
    for (const value of [' ', 'x'.repeat(501)]) {
      dialogs.prompt.mockResolvedValueOnce({ value });
      await expect(removal.remove('posts', post)).rejects.toThrow('1–500');
    }
    expect(api.removeCommunityAsAdmin).not.toHaveBeenCalled();
  });

  it('确认期间阻止重复请求，账号变化后不发送删除', async () => {
    login('admin');
    let confirm;
    dialogs.prompt.mockImplementation(
      () =>
        new Promise((resolve) => {
          confirm = resolve;
        }),
    );
    const removal = useCommunityRemoval();
    const first = removal.remove('posts', post);
    expect(removal.removing.value).toBe(true);
    expect(await removal.remove('posts', post)).toBe(false);
    login('user', 'different-user');
    confirm({ value: 'reason' });
    await expect(first).rejects.toThrow('登录状态已变化');
    expect(api.removeCommunityAsAdmin).not.toHaveBeenCalled();
    expect(removal.removing.value).toBe(false);
  });

  it('后端拒绝时保留错误并允许重试', async () => {
    login('admin');
    api.removeCommunityAsAdmin.mockRejectedValueOnce(new Error('权限已失效'));
    const removal = useCommunityRemoval();
    await expect(removal.remove('posts', post)).rejects.toThrow('权限已失效');
    expect(removal.removing.value).toBe(false);
    expect(await removal.remove('posts', post)).toBe(true);
  });
});
