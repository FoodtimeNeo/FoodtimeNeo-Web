import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import AppealOnlyView from './AppealOnlyView.vue';

const shared = vi.hoisted(() => ({
  auth: null,
  fetch: vi.fn(),
  actions: vi.fn(),
  submit: vi.fn(),
  success: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => shared.auth }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('element-plus', () => ({ ElMessage: { success: shared.success } }));
vi.mock('@/api/safety.api.js', () => ({
  fetchMyModerationDecisions: shared.fetch,
  fetchDecisionActions: shared.actions,
  submitAppeal: shared.submit,
}));
vi.mock('@/api/submission.api.js', () => ({ uploadImage: shared.upload }));
const decision = (reason = '本人决定') => ({
  decisionId: 'shared-decision',
  outcome: 'upheld',
  publicReason: reason,
  deliveredAt: new Date().toISOString(),
  appealDeadline: new Date(Date.now() + 86400000).toISOString(),
});
let wrapper;
async function render() {
  wrapper = mount(AppealOnlyView);
  await flushPromises();
}
const button = (text) =>
  wrapper.findAll('button').find((item) => item.text() === text);
const actor = (id) => (shared.auth.user = { id, email: id + '@example.test' });
const image = (name = '证据.png') =>
  new File(['image'], name, { type: 'image/png' });
const media = (number) =>
  `/api/v1/media/00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
async function choose(files) {
  const input = wrapper.get('input[type=file]');
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
  await flushPromises();
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  shared.auth = reactive({ user: { id: 'actor-a' }, isRestricted: true });
  shared.fetch.mockImplementation(async () => ({
    items: [decision()],
    page: 1,
    size: 20,
    total: 1,
  }));
  shared.actions.mockResolvedValue([]);
  shared.submit.mockResolvedValue({ id: 'appeal', status: 'submitted' });
});
afterEach(() => wrapper?.unmount());

it('同一决定的双方切换账号时草稿隔离，本人重新进入可以恢复', async () => {
  await render();
  await wrapper.get('textarea').setValue('A 的私密申诉内容');
  actor('actor-b');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('');
  await wrapper.get('textarea').setValue('B 的私密申诉内容');
  actor('actor-a');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('A 的私密申诉内容');
  actor('actor-b');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('B 的私密申诉内容');
});

it('未标记归属的旧版草稿不自动归给当前账号，也不擅自删除', async () => {
  const key = 'foodtime:appeal-draft:shared-decision';
  sessionStorage.setItem(key, JSON.stringify({ content: '未知归属的旧草稿' }));
  await render();
  expect(wrapper.get('textarea').element.value).toBe('');
  expect(sessionStorage.getItem(key)).toContain('未知归属的旧草稿');
});

it('账号切换取消旧读取，旧响应不能覆盖当前账号决定', async () => {
  let resolveOld;
  shared.fetch.mockImplementationOnce(
    () => new Promise((resolve) => (resolveOld = resolve)),
  );
  await render();
  const signal = shared.fetch.mock.calls[0][1].signal;
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  resolveOld({ items: [decision('A 的旧响应')] });
  await flushPromises();
  expect(wrapper.text()).not.toContain('A 的旧响应');
  expect(wrapper.text()).toContain('本人决定');
});

it('切号取消提交，迟到成功不清理新账号草稿或弹出旧账号提示', async () => {
  let complete;
  shared.submit.mockImplementationOnce(
    () => new Promise((resolve) => (complete = resolve)),
  );
  await render();
  await wrapper.get('textarea').setValue('A 私密材料');
  await button('提交申诉').trigger('click');
  await flushPromises();
  const signal = shared.submit.mock.calls[0][2].signal;
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  await wrapper.get('textarea').setValue('B 当前材料');
  complete({ id: 'old-appeal', status: 'submitted' });
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('B 当前材料');
  expect(shared.success).not.toHaveBeenCalled();
});

it('同账号重新挂载恢复草稿，失败重试复用编号，成功只清理本人草稿', async () => {
  await render();
  await wrapper.get('textarea').setValue('A 的材料');
  wrapper.unmount();
  await render();
  expect(wrapper.get('textarea').element.value).toBe('A 的材料');
  shared.submit.mockRejectedValueOnce(new Error('网络中断'));
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('网络中断');
  const requestId = shared.submit.mock.calls[0][1].clientRequestId;
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.submit.mock.calls[1][1].clientRequestId).toBe(requestId);
  expect(shared.success).toHaveBeenCalledTimes(1);
  wrapper.unmount();
  await render();
  expect(wrapper.get('textarea').element.value).toBe('');
});

it('处理动作读取失败可重试，切号时旧动作响应也会被隔离', async () => {
  shared.actions.mockRejectedValueOnce(new Error('动作读取失败'));
  await render();
  await button('查看处理动作').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('动作读取失败');
  await button('收起处理动作').trigger('click');
  await button('查看处理动作').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('尚未记录实际处理动作');
  const signal = shared.actions.mock.calls[1][1].signal;
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  expect(wrapper.text()).not.toContain('尚未记录实际处理动作');
});

it('失去受限会话后立即清空界面并停止读取，卸载取消在途请求', async () => {
  await render();
  const signal = shared.fetch.mock.calls[0][1].signal;
  shared.auth.user = null;
  await flushPromises();
  expect(signal.aborted).toBe(true);
  expect(wrapper.find('textarea').exists()).toBe(false);
  expect(shared.fetch).toHaveBeenCalledTimes(1);
  actor('actor-a');
  await flushPromises();
  const activeSignal = shared.fetch.mock.calls[1][1].signal;
  wrapper.unmount();
  expect(activeSignal.aborted).toBe(true);
});

it('已上传的证据随本人草稿恢复，提交失败重试不重复上传', async () => {
  await render();
  await wrapper.get('textarea').setValue('说明与证据');
  shared.upload.mockResolvedValueOnce({ imageUrl: media(1) });
  await choose([image()]);
  wrapper.unmount();
  await render();
  expect(wrapper.get('.appeal-only__evidence img').attributes('src')).toBe(
    media(1),
  );
  shared.submit.mockRejectedValueOnce(new Error('关联失败'));
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.submit.mock.calls[0][1].evidenceUrls).toEqual([media(1)]);
  expect(wrapper.text()).toContain('关联失败');
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.upload).toHaveBeenCalledTimes(1);
  expect(shared.submit.mock.calls[1][1]).toEqual(
    shared.submit.mock.calls[0][1],
  );
  wrapper.unmount();
  await render();
  expect(wrapper.find('.appeal-only__evidence img').exists()).toBe(false);
});

it('同一决定双方的图片引用隔离，移除仅修改本人草稿', async () => {
  await render();
  shared.upload
    .mockResolvedValueOnce({ imageUrl: media(1) })
    .mockResolvedValueOnce({ imageUrl: media(2) });
  await choose([image('A.png')]);
  actor('actor-b');
  await flushPromises();
  expect(wrapper.find('.appeal-only__evidence img').exists()).toBe(false);
  await choose([image('B.png')]);
  actor('actor-a');
  await flushPromises();
  expect(wrapper.get('.appeal-only__evidence img').attributes('src')).toBe(
    media(1),
  );
  await button('移除').trigger('click');
  expect(wrapper.find('.appeal-only__evidence img').exists()).toBe(false);
  actor('actor-b');
  await flushPromises();
  expect(wrapper.get('.appeal-only__evidence img').attributes('src')).toBe(
    media(2),
  );
});

it('超过三张或非图片不会上传', async () => {
  await render();
  await choose([
    image('1.png'),
    image('2.png'),
    image('3.png'),
    image('4.png'),
  ]);
  expect(wrapper.text()).toContain('证据图片最多3张');
  await choose([new File(['x'], 'bad.svg', { type: 'image/svg+xml' })]);
  expect(wrapper.text()).toContain('只支持 JPEG 或 PNG');
  expect(shared.upload).not.toHaveBeenCalled();
});

it('部分上传失败保留成功引用，只重试未上传图片，未完成时阻止提交', async () => {
  await render();
  await wrapper.get('textarea').setValue('材料');
  shared.upload
    .mockResolvedValueOnce({ imageUrl: media(1) })
    .mockRejectedValueOnce(new Error('第二张断网'));
  await choose([image('1.png'), image('2.png'), image('3.png')]);
  expect(shared.upload).toHaveBeenCalledTimes(2);
  expect(wrapper.findAll('.appeal-only__evidence img')).toHaveLength(1);
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.submit).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('请先完成证据上传');
  shared.upload
    .mockResolvedValueOnce({ imageUrl: media(2) })
    .mockResolvedValueOnce({ imageUrl: media(3) });
  await button('重试未上传图片').trigger('click');
  await flushPromises();
  expect(shared.upload).toHaveBeenCalledTimes(4);
  expect(shared.upload.mock.calls.map(([file]) => file.name)).toEqual([
    '1.png',
    '2.png',
    '2.png',
    '3.png',
  ]);
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.submit.mock.calls[0][1].evidenceUrls).toEqual([
    media(1),
    media(2),
    media(3),
  ]);
});

it('切号取消上传，迟到引用不保存到新账号也不继续其他文件', async () => {
  await render();
  let complete;
  shared.upload.mockImplementationOnce(
    () => new Promise((resolve) => (complete = resolve)),
  );
  await choose([image('A1.png'), image('A2.png')]);
  const signal = shared.upload.mock.calls[0][1].signal;
  expect(button('提交申诉').element.disabled).toBe(true);
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  complete({ imageUrl: media(1) });
  await flushPromises();
  expect(shared.upload).toHaveBeenCalledTimes(1);
  expect(wrapper.find('.appeal-only__evidence img').exists()).toBe(false);
  expect(wrapper.text()).not.toContain('A1.png');
  expect(shared.submit).not.toHaveBeenCalled();
});

it('重新进入时提示未完成上传，并过滤异常本地图片引用', async () => {
  await render();
  shared.upload.mockRejectedValueOnce(new Error('上传失败'));
  await choose([image()]);
  wrapper.unmount();
  const key = Object.keys(sessionStorage).find((item) =>
    item.startsWith('foodtime:appeal-draft:v2:'),
  );
  const saved = JSON.parse(sessionStorage.getItem(key));
  saved.evidence.push({
    url: 'https://example.test/private-tracker',
    name: '异常引用',
  });
  sessionStorage.setItem(key, JSON.stringify(saved));
  await render();
  expect(wrapper.text()).toContain('上次有图片未完成上传');
  expect(wrapper.find('.appeal-only__evidence img').exists()).toBe(false);
});

function useDecisionPages() {
  const rows = Array.from({ length: 23 }, (_, index) => ({
    ...decision(`第${index + 1}条决定`),
    decisionId: `decision-${index + 1}`,
  }));
  shared.fetch.mockImplementation(async (page) => ({
    items: rows.slice((page - 1) * 20, page * 20),
    page,
    size: 20,
    total: rows.length,
  }));
  return rows;
}
const pageButton = (page) => wrapper.get(`button[aria-label="第 ${page} 页"]`);

it('超过20条时可直接进入第二页，对第21条决定申诉', async () => {
  useDecisionPages();
  await render();
  expect(wrapper.findAll('.appeal-only__list > li')).toHaveLength(20);
  await pageButton(2).trigger('click');
  await flushPromises();
  expect(shared.fetch.mock.calls.at(-1)[0]).toBe(2);
  expect(wrapper.text()).toContain('第21条决定');
  expect(wrapper.findAll('.appeal-only__list > li')).toHaveLength(3);
  await wrapper.get('textarea').setValue('第21条的申诉');
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.submit.mock.calls[0][0]).toBe('decision-21');
});

it('翻页失败保留原页，重试仍请求失败的页码', async () => {
  const rows = useDecisionPages();
  let fail = true;
  shared.fetch.mockImplementation(async (page) => {
    if (page === 2 && fail) {
      fail = false;
      throw new Error('第二页失败');
    }
    return {
      items: rows.slice((page - 1) * 20, page * 20),
      page,
      size: 20,
      total: 23,
    };
  });
  await render();
  await pageButton(2).trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('第二页失败');
  expect(wrapper.text()).toContain('第1条决定');
  expect(pageButton(1).attributes('aria-current')).toBe('page');
  await button('重试').trigger('click');
  await flushPromises();
  expect(shared.fetch.mock.calls.at(-1)[0]).toBe(2);
  expect(wrapper.text()).toContain('第21条决定');
});

it('来回分页保留每份决定的文字、已上传引用和重试编号', async () => {
  useDecisionPages();
  await render();
  shared.upload.mockResolvedValue({ imageUrl: media(1) });
  await wrapper.get('textarea').setValue('第一页私密材料');
  await choose([image('第一页.png')]);
  await pageButton(2).trigger('click');
  await flushPromises();
  await wrapper.get('textarea').setValue('第二页材料');
  await pageButton(1).trigger('click');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('第一页私密材料');
  expect(wrapper.get('.appeal-only__evidence img').attributes('src')).toBe(
    media(1),
  );
  shared.submit.mockRejectedValueOnce(new Error('关联失败'));
  await button('提交申诉').trigger('click');
  await flushPromises();
  const requestId = shared.submit.mock.calls[0][1].clientRequestId;
  await pageButton(2).trigger('click');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('第二页材料');
  await pageButton(1).trigger('click');
  await flushPromises();
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.submit.mock.calls[1][1].clientRequestId).toBe(requestId);
  expect(shared.upload).toHaveBeenCalledTimes(1);
});

it('切换账号取消第二页请求，新账号从第一页读取且不接受旧响应', async () => {
  const rows = useDecisionPages();
  let old;
  shared.fetch.mockImplementation((page) =>
    page === 2
      ? new Promise((resolve) => {
          old = resolve;
        })
      : Promise.resolve({
          items:
            shared.auth.user.id === 'actor-a'
              ? rows.slice(0, 20)
              : [decision('B的决定')],
          page: 1,
          size: 20,
          total: shared.auth.user.id === 'actor-a' ? 23 : 1,
        }),
  );
  await render();
  await pageButton(2).trigger('click');
  await flushPromises();
  const signal = shared.fetch.mock.calls.at(-1)[1].signal;
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  old({ items: rows.slice(20), page: 2, size: 20, total: 23 });
  await flushPromises();
  expect(wrapper.text()).toContain('B的决定');
  expect(wrapper.text()).not.toContain('第21条决定');
  expect(shared.fetch.mock.calls.at(-1)[0]).toBe(1);
  expect(wrapper.find('.pagination').exists()).toBe(false);
});

it('上传期间锁定分页，完成后才允许切页', async () => {
  useDecisionPages();
  await render();
  let complete;
  shared.upload.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await choose([image()]);
  expect(pageButton(2).element.disabled).toBe(true);
  await pageButton(2).trigger('click');
  await flushPromises();
  expect(shared.fetch).toHaveBeenCalledTimes(1);
  complete({ imageUrl: media(1) });
  await flushPromises();
  expect(pageButton(2).element.disabled).toBe(false);
  await pageButton(2).trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('第21条决定');
});

it('总数缩减导致第二页越界时回退至有效末页', async () => {
  const rows = useDecisionPages();
  let reduced = false;
  shared.fetch.mockImplementation(async (page) => {
    if (page === 2) {
      reduced = true;
      return { items: [], page, size: 20, total: 20 };
    }
    return {
      items: rows.slice(0, 20),
      page,
      size: 20,
      total: reduced ? 20 : 23,
    };
  });
  await render();
  await pageButton(2).trigger('click');
  await flushPromises();
  expect(shared.fetch.mock.calls.map(([page]) => page)).toEqual([1, 2, 1]);
  expect(wrapper.findAll('.appeal-only__list > li')).toHaveLength(20);
  expect(wrapper.find('.pagination').exists()).toBe(false);
});
