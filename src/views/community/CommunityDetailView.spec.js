import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityDetailView from './CommunityDetailView.vue';
const api = vi.hoisted(() => ({ fetchCommunityPostDetail: vi.fn() }));
vi.mock('@/api/community.api.js', () => api);
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { postId: 'p1' } }),
  useRouter: () => ({ replace: vi.fn() }),
}));
function view() {
  return mount(CommunityDetailView, {
    global: {
      stubs: { RouterLink: RouterLinkStub, CommunityCommentSection: true },
    },
  });
}
describe('真实帖子详情', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });
  it('呈现标题正文作者和可切换的多图', async () => {
    api.fetchCommunityPostDetail.mockResolvedValue({
      id: 'p1',
      title: '午餐食记',
      content: '一碗热汤',
      author: { name: '同学' },
      status: 'approved',
      createdAt: '2026-10-23T01:00:00Z',
      images: [{ url: '/one' }, { url: '/two' }],
    });
    const wrapper = view();
    await flushPromises();
    expect(api.fetchCommunityPostDetail).toHaveBeenCalledWith('p1');
    expect(wrapper.text()).toContain('午餐食记');
    expect(wrapper.text()).toContain('一碗热汤');
    expect(wrapper.text()).toContain('同学');
    expect(wrapper.findAll('.community-image-viewer__dot')).toHaveLength(2);
    await wrapper.find('[aria-label="下一张图片"]').trigger('click');
    expect(
      wrapper.find('.community-image-viewer__track').attributes('style'),
    ).toContain('-100%');
  });
  it('待审帖子显示审核阶段并关闭公共评论入口', async () => {
    api.fetchCommunityPostDetail.mockResolvedValue({
      id: 'p1',
      title: '待审核',
      content: '正文',
      status: 'pending',
      reviewStage: 'manual_pending',
      images: [],
      createdAt: '2026-10-23T01:00:00Z',
    });
    const wrapper = view();
    await flushPromises();
    expect(wrapper.text()).toContain('已转人工审核');
    expect(
      wrapper.findComponent({ name: 'CommunityCommentSection' }).exists(),
    ).toBe(false);
  });
  it('不存在时显示可重试错误', async () => {
    api.fetchCommunityPostDetail.mockRejectedValue(
      new Error('帖子不存在或已删除'),
    );
    const wrapper = view();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      '帖子不存在或已删除',
    );
  });
});
