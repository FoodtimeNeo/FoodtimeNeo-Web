import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useCommunityRemoval } from './useCommunityRemoval.js';
const api = vi.hoisted(() => ({
  deleteCommunityPost: vi.fn(),
  deletePostComment: vi.fn(),
  removeCommunityAsAdmin: vi.fn(),
  fetchCommunityPostDetail: vi.fn(),
  fetchRootComments: vi.fn(),
  fetchCommentReplies: vi.fn(),
}));
const dialogs = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('@/api/community.api.js', () => api);
vi.mock('element-plus', () => ({ ElMessageBox: dialogs }));
const post = { id: 'post', userId: 'author', title: '要删除的食记' };
let dialog;
function login(role = 'admin', id = 'manager') {
  useAuthStore().user = { id, role };
}
async function click(action = 'confirm') {
  await dialog.options.beforeClose(action, dialog.instance, () =>
    action === 'confirm' ? dialog.resolve('confirm') : dialog.reject('cancel'),
  );
}
beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  dialogs.confirm.mockImplementation(
    (message, title, options) =>
      new Promise((resolve, reject) => {
        dialog = { message, title, options, resolve, reject, instance: {} };
      }),
  );
});
describe('无需原因的社区删除确认', () => {
  it.each(['admin', 'superadmin'])(
    '%s 无需填写原因仍可删除他人内容',
    async (role) => {
      login(role);
      const removal = useCommunityRemoval();
      const work = removal.remove('posts', post);
      await click();
      expect(await work).toBe(true);
      expect(api.removeCommunityAsAdmin).toHaveBeenCalledWith('posts', 'post');
      expect(removal.outcome.value).toBe('deleted');
    },
  );
  it('作者使用作者接口；其他用户与游客不能删除', async () => {
    const removal = useCommunityRemoval();
    expect(await removal.remove('posts', post)).toBe(false);
    login('user', 'viewer');
    expect(await removal.remove('posts', post)).toBe(false);
    login('user', 'author');
    const work = removal.remove('posts', post);
    await click();
    expect(await work).toBe(true);
    expect(api.deleteCommunityPost).toHaveBeenCalledWith('post');
  });
  it('取消与切换身份/内容后确认都不能发送请求', async () => {
    login();
    const removal = useCommunityRemoval();
    let current = true;
    const work = removal.remove('posts', post, { isCurrent: () => current });
    current = false;
    await click();
    expect(dialog.instance.confirmButtonDisabled).toBe(true);
    expect(api.removeCommunityAsAdmin).not.toHaveBeenCalled();
    await click('cancel');
    expect(await work).toBe(false);
  });
  it('请求失败保留确认框并允许显式重试', async () => {
    login();
    api.removeCommunityAsAdmin.mockRejectedValueOnce(new Error('权限校验失败'));
    const removal = useCommunityRemoval();
    const work = removal.remove('posts', post);
    await click();
    expect(removal.removing.value).toBe(true);
    expect(dialog.instance.confirmButtonLoading).toBe(false);
    await click();
    expect(await work).toBe(true);
    expect(api.removeCommunityAsAdmin).toHaveBeenCalledTimes(2);
  });
  it('超时先读取确认，内容已不可见时不重发DELETE', async () => {
    login();
    api.removeCommunityAsAdmin.mockRejectedValueOnce({ code: 'TIMEOUT' });
    api.fetchCommunityPostDetail.mockRejectedValueOnce({
      status: 404,
      bizCode: 'CONTENT_NOT_FOUND',
    });
    const removal = useCommunityRemoval();
    const work = removal.remove('posts', post);
    await click();
    expect(dialog.instance.confirmButtonText).toBe('刷新确认结果');
    await click();
    expect(await work).toBe(true);
    expect(removal.outcome.value).toBe('missing');
    expect(api.removeCommunityAsAdmin).toHaveBeenCalledOnce();
  });
  it('请求期间忽略重复点击和取消', async () => {
    login();
    let finish;
    api.removeCommunityAsAdmin.mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const removal = useCommunityRemoval();
    const work = removal.remove('posts', post);
    const first = click();
    await click();
    await click('cancel');
    expect(api.removeCommunityAsAdmin).toHaveBeenCalledOnce();
    finish();
    await first;
    expect(await work).toBe(true);
  });
});
