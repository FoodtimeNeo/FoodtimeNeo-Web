import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
import CommunityPostContent from './CommunityPostContent.vue';
import CommunityPostDetailModal from './CommunityPostDetailModal.vue';
import CommunityCommentSection from './CommunityCommentSection.vue';

const api = vi.hoisted(() => ({
  fetchCommunityPostDetail: vi.fn(),
  fetchPostComments: vi.fn(),
  fetchRootComments: vi.fn(),
  fetchCommentReplies: vi.fn(),
  createPostComment: vi.fn(),
  setPostLike: vi.fn(),
  setPostFavorite: vi.fn(),
  setCommentLike: vi.fn(),
  deleteCommunityPost: vi.fn(),
  deletePostComment: vi.fn(),
  removeCommunityAsAdmin: vi.fn(),
}));
const dialogs = vi.hoisted(() => ({ prompt: vi.fn(), confirm: vi.fn() }));
vi.mock('@/api/community.api.js', () => api);
vi.mock('element-plus', () => ({
  ElMessageBox: dialogs,
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
const post = {
  id: 'post',
  userId: 'author',
  author: { id: 'author', name: '作者' },
  title: '社区帖子',
  content: '正文',
  images: [],
  status: 'approved',
  commentCount: 1,
  createdAt: '2026-11-01T00:00:00Z',
};
const comment = {
  id: 'comment',
  userId: 'author',
  author: { id: 'author', name: '作者' },
  content: '评论内容',
  status: 'approved',
  createdAt: '2026-11-01T00:00:00Z',
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  api.fetchCommunityPostDetail.mockResolvedValue({ ...post });
  api.fetchPostComments.mockResolvedValue([{ ...comment }]);
  api.fetchRootComments.mockResolvedValue({
    items: [{ ...comment }],
    hasMore: false,
  });
  api.fetchCommentReplies.mockResolvedValue({ items: [], hasMore: false });
  dialogs.prompt.mockResolvedValue({ value: '违反社区规范' });
  dialogs.confirm.mockResolvedValue('confirm');
});

describe('社区详情中的管理入口', () => {
  for (const [component, selector, props] of [
    [CommunityPostContent, '.post-delete', { postId: 'post' }],
    [
      CommunityPostDetailModal,
      '.mobile-delete-btn, .redbook-delete-btn',
      { postId: 'post', modelValue: true },
    ],
  ]) {
    it.each(['admin', 'superadmin'])(
      `${component.__name}: %s 在手机和桌面入口都能删除他人帖子`,
      async (role) => {
        useAuthStore().user = { id: 'manager', role };
        const wrapper = mount(component, {
          props,
          global: { stubs: { Teleport: true, CommunityCommentSection: true } },
        });
        await flushPromises();
        expect(wrapper.findAll(selector)).toHaveLength(2);
        await wrapper.findAll(selector)[0].trigger('click');
        await flushPromises();
        expect(api.removeCommunityAsAdmin).toHaveBeenCalledWith(
          'posts',
          'post',
          '违反社区规范',
        );
        expect(wrapper.emitted('deleted')).toHaveLength(1);
        wrapper.unmount();
      },
    );

    it(`${component.__name}: 普通用户看不到他人帖子的删除入口`, async () => {
      useAuthStore().user = { id: 'viewer', role: 'user' };
      const wrapper = mount(component, {
        props,
        global: { stubs: { Teleport: true, CommunityCommentSection: true } },
      });
      await flushPromises();
      expect(wrapper.findAll(selector)).toHaveLength(0);
      wrapper.unmount();
    });
  }

  it.each(['admin', 'superadmin'])(
    '%s 可在评论区删除他人评论并刷新楼层',
    async (role) => {
      useAuthStore().user = { id: 'manager', role };
      const wrapper = mount(CommunityCommentSection, {
        props: { postId: 'post' },
      });
      await flushPromises();
      await wrapper.get('.delete-button').trigger('click');
      await flushPromises();
      expect(api.removeCommunityAsAdmin).toHaveBeenCalledWith(
        'comments',
        'comment',
        '违反社区规范',
      );
      expect(api.fetchRootComments).toHaveBeenCalledTimes(2);
      expect(wrapper.emitted('changed')).toHaveLength(1);
      wrapper.unmount();
    },
  );

  it('旧版详情弹窗的评论也可直接管理', async () => {
    useAuthStore().user = { id: 'manager', role: 'admin' };
    const wrapper = mount(CommunityPostDetailModal, {
      props: { postId: 'post', modelValue: true },
      global: { stubs: { Teleport: true } },
    });
    await flushPromises();
    await wrapper.get('.cmt-delete-btn').trigger('click');
    await flushPromises();
    expect(api.removeCommunityAsAdmin).toHaveBeenCalledWith(
      'comments',
      'comment',
      '违反社区规范',
    );
    expect(api.fetchPostComments).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
