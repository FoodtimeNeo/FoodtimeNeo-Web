import { beforeEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SuperadminAnalyticsView from './SuperadminAnalyticsView.vue';

const fetchAdminDashboard = vi.hoisted(() => vi.fn());
vi.mock('@/api/analytics.api.js', () => ({
  fetchAdminDashboard,
}));

const mockData = {
  registeredUsers: 1248,
  onlineUsers: 86,
  reviews: 3862,
  replies: 5917,
  posts: 742,
  halls: 7,
  stalls: 46,
  dishes: 618,
  generatedAt: '2026-10-30T12:00:00Z',
  isMock: true,
  trend: [
    {
      day: '2026-10-24',
      newUsers: 7,
      newReviews: 68,
      newReplies: 104,
      newPosts: 12,
      onlinePeak: 91,
    },
    {
      day: '2026-10-25',
      newUsers: 9,
      newReviews: 75,
      newReplies: 118,
      newPosts: 15,
      onlinePeak: 96,
    },
    {
      day: '2026-10-26',
      newUsers: 6,
      newReviews: 61,
      newReplies: 97,
      newPosts: 11,
      onlinePeak: 88,
    },
    {
      day: '2026-10-27',
      newUsers: 12,
      newReviews: 88,
      newReplies: 143,
      newPosts: 19,
      onlinePeak: 112,
    },
    {
      day: '2026-10-28',
      newUsers: 8,
      newReviews: 79,
      newReplies: 126,
      newPosts: 16,
      onlinePeak: 105,
    },
    {
      day: '2026-10-29',
      newUsers: 11,
      newReviews: 95,
      newReplies: 158,
      newPosts: 22,
      onlinePeak: 127,
    },
    {
      day: '2026-10-30',
      newUsers: 10,
      newReviews: 92,
      newReplies: 151,
      newPosts: 24,
      onlinePeak: 119,
    },
  ],
};

beforeEach(() => {
  fetchAdminDashboard.mockReset().mockResolvedValue(mockData);
});

it('正确加载并渲染平台数据看板概览、核心指标与在线统计', async () => {
  const wrapper = mount(SuperadminAnalyticsView, {
    global: {
      stubs: {
        LoadingState: { template: '<div>loading</div>' },
        ErrorState: { template: '<div>error</div>' },
      },
    },
  });

  // 等待数据加载完成
  await vi.waitFor(() => expect(wrapper.text()).toContain('平台总览'));

  // 验证页头
  expect(wrapper.text()).toContain('数据看板');
  expect(wrapper.text()).toContain('MOCK 预览数据');

  // 验证当前在线 Hero 卡片
  expect(wrapper.text()).toContain('当前在线');
  expect(wrapper.text()).toContain('86');
  expect(wrapper.text()).toContain('7%');

  // 验证 8 大核心运营指标卡片
  expect(wrapper.text()).toContain('注册用户');
  expect(wrapper.text()).toContain('1,248');
  expect(wrapper.text()).toContain('评论数');
  expect(wrapper.text()).toContain('3,862');
  expect(wrapper.text()).toContain('回复数');
  expect(wrapper.text()).toContain('5,917');
  expect(wrapper.text()).toContain('社区食记');
  expect(wrapper.text()).toContain('742');
  expect(wrapper.text()).toContain('食堂');
  expect(wrapper.text()).toContain('7');
  expect(wrapper.text()).toContain('档口');
  expect(wrapper.text()).toContain('46');
  expect(wrapper.text()).toContain('菜品');
  expect(wrapper.text()).toContain('618');
  expect(wrapper.text()).toContain('在线用户');

  // 验证近 7 日趋势曲线图组件与节点
  expect(wrapper.text()).toContain('近 7 日趋势');
  expect(wrapper.find('.trend-svg').exists()).toBe(true);
  expect(wrapper.find('.curve-line').exists()).toBe(true);
  expect(wrapper.findAll('.chart-node').length).toBe(7);

  // 验证今日活跃明细表格
  expect(wrapper.text()).toContain('今日活跃');
  expect(wrapper.text()).toContain('+10'); // 今日新增用户
  expect(wrapper.text()).toContain('+92'); // 今日新增评论
  expect(wrapper.text()).toContain('+24'); // 今日新增食记
});

it('支持切换近 7 日趋势的指标 Tab', async () => {
  const wrapper = mount(SuperadminAnalyticsView, {
    global: {
      stubs: {
        LoadingState: true,
        ErrorState: true,
      },
    },
  });

  await vi.waitFor(() => expect(wrapper.text()).toContain('近 7 日趋势'));

  const tabs = wrapper.findAll('.trend-tab');
  expect(tabs.length).toBe(4);

  // 切换到评论互动
  await tabs[1].trigger('click');
  expect(tabs[1].classes()).toContain('is-active');

  // 切换到社区食记
  await tabs[2].trigger('click');
  expect(tabs[2].classes()).toContain('is-active');

  // 曲线路径存在
  const curve = wrapper.find('.curve-line');
  expect(curve.exists()).toBe(true);
  expect(curve.classes()).toContain('curve-line--green');
});

it('点击刷新数据按钮时重新发起加载', async () => {
  const wrapper = mount(SuperadminAnalyticsView, {
    global: {
      stubs: {
        LoadingState: true,
        ErrorState: true,
      },
    },
  });

  await vi.waitFor(() => expect(wrapper.text()).toContain('平台总览'));
  expect(fetchAdminDashboard).toHaveBeenCalledTimes(1);

  const refreshBtn = wrapper.find('.refresh-btn');
  expect(refreshBtn.attributes('disabled')).toBeUndefined();
  await refreshBtn.trigger('click');
  expect(fetchAdminDashboard).toHaveBeenCalledTimes(2);
});
