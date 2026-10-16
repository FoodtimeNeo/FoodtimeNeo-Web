import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { ApiError } from '@/api/http.js';
import { createPinia, setActivePinia } from 'pinia';

const fetchCanteen = vi.fn();
const fetchStalls = vi.fn();
vi.mock('@/api/canteen.api.js', () => ({
  fetchCanteen: (...args) => fetchCanteen(...args),
  fetchStalls: (...args) => fetchStalls(...args),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { canteenId: 'c1' } }),
  RouterLink: RouterLinkStub,
}));

import CanteenDetailView from './CanteenDetailView.vue';

function mountView() {
  return mount(CanteenDetailView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('CanteenDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchCanteen.mockReset();
    fetchStalls.mockReset();
  });

  it('加载成功后展示食堂名称与档口', async () => {
    fetchCanteen.mockResolvedValue({
      id: 'c1',
      name: '西区食堂',
      summary: '面食稳',
    });
    fetchStalls.mockResolvedValue([
      { id: 's1', name: '面档', imageUrl: '/s1.jpg' },
    ]);
    const wrapper = mountView();
    await flushPromises();
    expect(fetchCanteen).toHaveBeenCalledWith('c1');
    expect(wrapper.text()).toContain('西区食堂');
    expect(wrapper.text()).toContain('面档');
  });

  it('食堂不存在时显示错误态', async () => {
    fetchCanteen.mockRejectedValue(
      new ApiError('食堂不存在', { status: 404, code: 'NOT_FOUND' }),
    );
    fetchStalls.mockResolvedValue([]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('食堂不存在');
  });

  it('食堂存在但无档口时显示空态', async () => {
    fetchCanteen.mockResolvedValue({ id: 'c1', name: '西区食堂' });
    fetchStalls.mockResolvedValue([]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('这个食堂还没有档口');
  });

  it('按真实档口名称过滤，零匹配可恢复，空封面不保留整块图片区', async () => {
    fetchCanteen.mockResolvedValue({
      id: 'c1',
      name: '西区食堂',
      coverImageUrl: null,
    });
    fetchStalls.mockResolvedValue([
      { id: 's1', name: '面档' },
      { id: 's2', name: '减脂餐' },
    ]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find('.canteen-detail__hero-image').exists()).toBe(false);
    await wrapper.get('input').setValue('减脂');
    expect(wrapper.text()).toContain('找到 1 / 2 个档口');
    expect(wrapper.text()).not.toContain('面档');
    await wrapper.get('input').setValue('不存在');
    expect(wrapper.text()).toContain('没有匹配的档口');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '查看全部档口')
      .trigger('click');
    expect(wrapper.text()).toContain('面档');
    expect(fetchStalls).toHaveBeenCalledTimes(1);
  });
});
