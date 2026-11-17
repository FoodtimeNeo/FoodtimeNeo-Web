import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import View from './DishPriceHistoryView.vue';
const shared = vi.hoisted(() => ({
  clear: vi.fn(),
  auth: null,
  route: null,
  fetch: vi.fn(),
  dish: vi.fn(),
  edit: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/composables/useAsyncData.js', () => ({
  clearAsyncDataCache: shared.clear,
}));
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => shared.auth }));
vi.mock('vue-router', () => ({ useRoute: () => shared.route }));
vi.mock('@/api/dish.api.js', () => ({ fetchDish: shared.dish }));
vi.mock('@/api/price-history.api.js', () => ({
  fetchPriceHistory: shared.fetch,
  correctPriceHistory: shared.edit,
  deletePriceHistory: shared.remove,
}));
let wrapper;
const button = (text) =>
  wrapper.findAll('button').find((item) => item.text() === text);
const record = (id, price = 12) => ({
  id: String(id),
  price,
  priceUnit: 'serving',
  recordedAt: '2026-11-13T00:00:00Z',
  revision: 1,
  origin: 'changed',
});
const data = () => ({
  dishId: 'dish',
  dishName: '示例菜品',
  currentPrice: 15,
  priceUnit: 'serving',
  revision: 3,
  canManage: true,
  totalRecords: 2,
  windowEnd: '2026-11-13T12:00:00Z',
  records: [record(1), record(2, 15)],
});
async function render() {
  wrapper = mount(View, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        PriceHistoryChart: true,
        ElDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue" role="dialog"><slot /></div>',
        },
      },
    },
  });
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  shared.auth = reactive({ user: { id: 'a' }, can: () => true });
  shared.route = reactive({
    params: { dishId: 'dish', stallId: 'stall', canteenId: 'hall' },
  });
  shared.dish.mockResolvedValue({
    id: 'dish',
    stallId: 'stall',
    diningHallId: 'hall',
  });
  shared.fetch.mockImplementation(async () => data());
  shared.edit.mockResolvedValue(null);
  shared.remove.mockResolvedValue(null);
});
afterEach(() => wrapper?.unmount());
it('从菜品进入时读取全部历史，切换区间独立请求', async () => {
  await render();
  expect(shared.fetch.mock.calls[0].slice(0, 2)).toEqual(['dish', 0]);
  await button('近30天').trigger('click');
  await flushPromises();
  expect(shared.fetch.mock.calls.at(-1).slice(0, 2)).toEqual(['dish', 30]);
});
it('没有管理能力时不显示历史管理入口', async () => {
  shared.auth.can = () => false;
  await render();
  expect(button('更正')).toBeUndefined();
  expect(button('删除')).toBeUndefined();
});
it('只剩唯一全局记录时保留更正并禁用删除', async () => {
  shared.fetch.mockResolvedValue({
    ...data(),
    records: [record(1)],
    totalRecords: 1,
  });
  await render();
  expect(button('更正').exists()).toBe(true);
  expect(button('删除').attributes('disabled')).toBeDefined();
});
it('更正最新记录明确提示当前价同步，携带正确版本与单位', async () => {
  await render();
  await button('更正').trigger('click');
  expect(wrapper.get('[role=dialog]').text()).toContain('同步修改');
  await wrapper.get('input').setValue('0');
  await wrapper.get('select').setValue('kg');
  await button('确认').trigger('click');
  await flushPromises();
  expect(shared.edit).toHaveBeenCalledWith(
    'dish',
    '2',
    { price: 0, priceUnit: 'kg', expectedRevision: 3 },
    expect.any(Object),
  );
  expect(shared.fetch).toHaveBeenCalledTimes(2);
  expect(shared.clear).toHaveBeenCalledOnce();
});
it('删除必须确认，取消不写入；确认携带快照版本', async () => {
  await render();
  await button('删除').trigger('click');
  await button('取消').trigger('click');
  expect(shared.remove).not.toHaveBeenCalled();
  await button('删除').trigger('click');
  await button('确认').trigger('click');
  await flushPromises();
  expect(shared.remove).toHaveBeenCalledWith(
    'dish',
    '2',
    3,
    expect.any(Object),
  );
});
it('保存失败保留输入，刷新冲突记录不自动再次提交', async () => {
  shared.edit.mockRejectedValue(new Error('资料已更新'));
  await render();
  await button('更正').trigger('click');
  await wrapper.get('input').setValue('16');
  await button('确认').trigger('click');
  await flushPromises();
  expect(wrapper.get('input').element.value).toBe('16');
  expect(wrapper.get('[role=alert]').text()).toContain('资料已更新');
  await button('刷新记录').trigger('click');
  await flushPromises();
  expect(shared.edit).toHaveBeenCalledTimes(1);
  expect(wrapper.find('[role=dialog]').exists()).toBe(false);
});
it('保存期间禁用范围与确认，防止重复写入', async () => {
  let finish;
  shared.edit.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render();
  await button('更正').trigger('click');
  await button('确认').trigger('click');
  await flushPromises();
  expect(button('近30天').attributes('disabled')).toBeDefined();
  expect(button('保存中…').attributes('disabled')).toBeDefined();
  finish();
  await flushPromises();
  expect(shared.edit).toHaveBeenCalledTimes(1);
});
it('换号中止旧读取，迟到结果不能覆盖新账号', async () => {
  let finish, signal;
  shared.fetch.mockImplementationOnce((id, days, options) => {
    signal = options.signal;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  await render();
  shared.auth.user = { id: 'b' };
  await flushPromises();
  expect(signal.aborted).toBe(true);
  finish({ ...data(), dishName: '旧账号迟到结果' });
  await flushPromises();
  expect(wrapper.text()).not.toContain('旧账号迟到结果');
  expect(wrapper.text()).toContain('示例菜品');
});
it('菜品归属不匹配不读取该路径下的历史', async () => {
  shared.dish.mockResolvedValue({ stallId: 'other', diningHallId: 'hall' });
  await render();
  expect(shared.fetch).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('不匹配');
});
