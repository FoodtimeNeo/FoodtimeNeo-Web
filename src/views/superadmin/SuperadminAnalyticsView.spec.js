import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
import { dashboardFixture } from '@/api/__fixtures__/dashboard.js';
import { mount, enableAutoUnmount, flushPromises } from '@vue/test-utils';
enableAutoUnmount(afterEach);
import SuperadminAnalyticsView from './SuperadminAnalyticsView.vue';

const fetchAdminDashboard = vi.hoisted(() => vi.fn());
vi.mock('@/api/analytics.api.js', () => ({
  fetchAdminDashboard,
}));

let mockData;

beforeEach(() => {
  setActivePinia(createPinia());
  useAuthStore().$patch({
    user: { id: 'one', role: 'superadmin', displayName: 'test' },
    initialized: true,
  });
  mockData = dashboardFixture();
  fetchAdminDashboard.mockReset().mockResolvedValue(mockData);
});

it('零计数相邻增长时曲线不产生负数区间', async () => {
  mockData.trend.forEach((point, index) => {
    point.newUsers = index === mockData.trend.length - 1 ? 5 : 0;
  });
  const wrapper = mount(SuperadminAnalyticsView);
  await flushPromises();
  const path = wrapper.get('.curve-line').attributes('d');
  const coordinates = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const zeroBaseline = coordinates[1];
  // A Bezier lies within its control points; every Y must stay above the zero baseline.
  for (let index = 1; index < coordinates.length; index += 2) {
    expect(coordinates[index]).toBeLessThanOrEqual(zeroBaseline);
  }
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
  expect(wrapper.text()).not.toContain('MOCK');

  // 验证当前在线 Hero 卡片
  expect(wrapper.text()).toContain('当前在线');
  expect(wrapper.text()).toContain('86');
  expect(wrapper.text()).toContain('7%');

  // 验证 8 大核心运营指标卡片
  expect(wrapper.text()).toContain('有效用户');
  expect(wrapper.text()).toContain('1,248');
  expect(wrapper.text()).toContain('正式点评');
  expect(wrapper.text()).toContain('3,862');
  expect(wrapper.text()).toContain('正式回复');
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
  expect(wrapper.text()).toContain('当日新增');
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

function failed(status = 503) {
  return Object.assign(new Error('统计服务暂不可用'), { status });
}
it('首次失败显示错误，不填入预览数字，重试后恢复', async () => {
  fetchAdminDashboard.mockRejectedValueOnce(failed());
  const wrapper = mount(SuperadminAnalyticsView);
  await vi.waitFor(() => expect(wrapper.text()).toContain('数据看板加载失败'));
  expect(wrapper.find('.overview-hero').exists()).toBe(false);
  expect(wrapper.text()).not.toContain('1,248');
  await wrapper
    .getComponent({ name: 'ErrorState' })
    .get('button')
    .trigger('click');
  await vi.waitFor(() => expect(wrapper.text()).toContain('1,248'));
});
it('刷新失败明确标注上次快照，重试可以看到新数据', async () => {
  const wrapper = mount(SuperadminAnalyticsView);
  await vi.waitFor(() => expect(wrapper.text()).toContain('1,248'));
  fetchAdminDashboard.mockRejectedValueOnce(failed());
  await wrapper.get('.refresh-btn').trigger('click');
  await vi.waitFor(() =>
    expect(wrapper.get('.snapshot-warning').text()).toContain(
      '刷新失败，显示上次数据',
    ),
  );
  expect(wrapper.text()).toContain('1,248');
  fetchAdminDashboard.mockResolvedValueOnce({
    ...mockData,
    registeredUsers: 2000,
  });
  await wrapper.get('.snapshot-warning button').trigger('click');
  await vi.waitFor(() => expect(wrapper.text()).toContain('2,000'));
  expect(wrapper.find('.snapshot-warning').exists()).toBe(false);
});
it.each([401, 403])('HTTP %s后清理旧统计', async (status) => {
  const wrapper = mount(SuperadminAnalyticsView);
  await vi.waitFor(() => expect(wrapper.text()).toContain('1,248'));
  fetchAdminDashboard.mockRejectedValueOnce(failed(status));
  await wrapper.get('.refresh-btn').trigger('click');
  await vi.waitFor(() =>
    expect(wrapper.find('.overview-hero').exists()).toBe(false),
  );
  expect(wrapper.text()).not.toContain('1,248');
});
it('换账号丢弃旧请求，退出或降权清理数据', async () => {
  let resolveOld;
  fetchAdminDashboard.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const wrapper = mount(SuperadminAnalyticsView);
  fetchAdminDashboard.mockResolvedValueOnce({
    ...mockData,
    registeredUsers: 2222,
  });
  useAuthStore().$patch({ user: { id: 'two', role: 'superadmin' } });
  await vi.waitFor(() => expect(wrapper.text()).toContain('2,222'));
  resolveOld(mockData);
  await flushPromises();
  expect(wrapper.text()).toContain('2,222');
  expect(wrapper.text()).not.toContain('1,248');
  useAuthStore().$patch({ user: { id: 'two', role: 'admin' } });
  await flushPromises();
  expect(wrapper.find('.overview-hero').exists()).toBe(false);
  expect(wrapper.text()).not.toContain('2,222');
});
it('日活标签和北京时间正确，切换指标不额外取数', async () => {
  const wrapper = mount(SuperadminAnalyticsView);
  await vi.waitFor(() => expect(wrapper.text()).toContain('日活用户'));
  expect(wrapper.text()).not.toContain('在线峰值');
  expect(wrapper.text()).toContain('北京时间');
  await wrapper.findAll('.trend-tab')[3].trigger('click');
  expect(fetchAdminDashboard).toHaveBeenCalledTimes(1);
});
