import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AdminReportThread from './AdminReportThread.vue';

const api = vi.hoisted(() => ({
  fetch: vi.fn(),
  reply: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('@/api/safety.api.js', () => ({
  fetchAdminReportFollowUps: api.fetch,
  replyReportFollowUp: api.reply,
}));
vi.mock('@/api/submission.api.js', () => ({ uploadImage: api.upload }));
const page = (items = [], total = items.length) => ({
  items,
  total,
  size: 20,
  page: 1,
});
let wrapper;
const button = (text) =>
  wrapper.findAll('button').find((item) => item.text() === text);
async function render() {
  wrapper = mount(AdminReportThread, { props: { reportId: 'closed-report' } });
}
async function open() {
  await button('查看/回复追问').trigger('click');
  await flushPromises();
}
async function choose(files) {
  const input = wrapper.get('input[type=file]');
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
  await flushPromises();
}
const image = (name = '证据.png') =>
  new File(['image'], name, { type: 'image/png' });

beforeEach(() => {
  vi.resetAllMocks();
  api.fetch.mockResolvedValue(page());
  api.reply.mockResolvedValue({ id: 'reply' });
});
afterEach(() => wrapper?.unmount());

it('追问按举报编号读取，重新打开刷新已完成案件的新材料', async () => {
  await render();
  expect(api.fetch).not.toHaveBeenCalled();
  await open();
  expect(api.fetch).toHaveBeenLastCalledWith(
    'closed-report',
    1,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(wrapper.text()).toContain('暂无追问记录');
  await button('收起追问').trigger('click');
  api.fetch.mockResolvedValue(
    page([
      {
        id: 'new-question',
        authorRole: 'reporter',
        content: '已完成后追加的问题',
      },
    ]),
  );
  await open();
  expect(wrapper.text()).toContain('已完成后追加的问题');
  expect(api.fetch).toHaveBeenCalledTimes(2);
});

it('超过20条的历史能翻页，并保留公开证据与仅管理端备注', async () => {
  api.fetch.mockResolvedValueOnce(page([{ id: 'old', content: '旧材料' }], 21));
  await render();
  await open();
  api.fetch.mockResolvedValueOnce(
    page(
      [
        {
          id: 'last',
          authorRole: 'staff',
          content: '第21条回复',
          internalNote: '管理备注',
          evidenceUrls: ['/api/v1/media/evidence'],
        },
      ],
      21,
    ),
  );
  await button('下一页').trigger('click');
  await flushPromises();
  expect(api.fetch).toHaveBeenLastCalledWith(
    'closed-report',
    2,
    expect.any(Object),
  );
  expect(wrapper.text()).toContain('第21条回复');
  expect(wrapper.text()).toContain('内部备注（不公开）：管理备注');
  expect(wrapper.get('.report-thread__messages img').attributes('src')).toBe(
    '/api/v1/media/evidence',
  );
});

it('读取失败可重试，快速关闭再打开时旧响应不能覆盖新记录', async () => {
  api.fetch.mockRejectedValueOnce(new Error('读取失败'));
  await render();
  await open();
  expect(wrapper.text()).toContain('读取失败');
  let completeOld;
  api.fetch.mockImplementationOnce(
    () => new Promise((resolve) => (completeOld = resolve)),
  );
  await button('重试读取').trigger('click');
  const oldSignal = api.fetch.mock.calls[1][2].signal;
  await button('收起追问').trigger('click');
  api.fetch.mockResolvedValue(page([{ id: 'fresh', content: '最新记录' }]));
  await open();
  expect(oldSignal.aborted).toBe(true);
  completeOld(page([{ id: 'stale', content: '过期响应' }]));
  await flushPromises();
  expect(wrapper.text()).toContain('最新记录');
  expect(wrapper.text()).not.toContain('过期响应');
});

it('回复失败保留材料并复用请求编号，成功后刷新到最新页', async () => {
  await render();
  await open();
  api.upload.mockResolvedValueOnce({ imageUrl: '/api/v1/media/owned' });
  await choose([image()]);
  await wrapper.get('textarea').setValue('公开答复');
  await wrapper.get('input[maxlength="2000"]').setValue('仅内部查看');
  api.reply.mockRejectedValueOnce(new Error('连接中断'));
  await button('提交回复').trigger('click');
  await flushPromises();
  const first = api.reply.mock.calls[0][1];
  expect(first).toMatchObject({
    content: '公开答复',
    internalNote: '仅内部查看',
    evidenceUrls: ['/api/v1/media/owned'],
  });
  expect(wrapper.text()).toContain('连接中断');
  expect(wrapper.get('textarea').element.value).toBe('公开答复');
  api.fetch.mockResolvedValue(
    page([{ id: 'created', content: '公开答复' }], 22),
  );
  await button('提交回复').trigger('click');
  await flushPromises();
  expect(api.reply.mock.calls[1][1].clientRequestId).toBe(
    first.clientRequestId,
  );
  expect(api.upload).toHaveBeenCalledTimes(1);
  expect(wrapper.get('textarea').element.value).toBe('');
  expect(wrapper.text()).toContain('回复已提交');
  expect(api.fetch).toHaveBeenLastCalledWith(
    'closed-report',
    2,
    expect.any(Object),
  );
});

it('提交期间阻止重复提交，卸载取消在途操作', async () => {
  await render();
  await open();
  await wrapper.get('textarea').setValue('答复');
  api.reply.mockImplementation(() => new Promise(() => {}));
  await button('提交回复').trigger('click');
  await flushPromises();
  await button('提交中…').trigger('click');
  expect(api.reply).toHaveBeenCalledTimes(1);
  const signal = api.reply.mock.calls[0][2].signal;
  wrapper.unmount();
  expect(signal.aborted).toBe(true);
});

it('图片超额或类型错误不上传，部分失败保留已成功的引用且可移除', async () => {
  await render();
  await open();
  await choose([
    image('1.png'),
    image('2.png'),
    image('3.png'),
    image('4.png'),
  ]);
  expect(wrapper.text()).toContain('证据图片最多3张');
  expect(api.upload).not.toHaveBeenCalled();
  await choose([new File(['x'], 'bad.svg', { type: 'image/svg+xml' })]);
  expect(wrapper.text()).toContain('只支持 JPEG 或 PNG');
  expect(api.upload).not.toHaveBeenCalled();
  api.upload
    .mockResolvedValueOnce({ imageUrl: '/api/v1/media/first' })
    .mockRejectedValueOnce(new Error('第二张失败'));
  await choose([image('1.png'), image('2.png')]);
  expect(wrapper.text()).toContain('第二张失败');
  expect(wrapper.get('.report-thread__evidence img').attributes('src')).toBe(
    '/api/v1/media/first',
  );
  await button('移除').trigger('click');
  expect(wrapper.find('.report-thread__evidence img').exists()).toBe(false);
});

it('上传中卸载后不继续上传其余图片或提交关联', async () => {
  await render();
  await open();
  let complete;
  api.upload.mockImplementationOnce(
    () => new Promise((resolve) => (complete = resolve)),
  );
  await choose([image('1.png'), image('2.png')]);
  const signal = api.upload.mock.calls[0][1].signal;
  wrapper.unmount();
  expect(signal.aborted).toBe(true);
  complete({ imageUrl: '/api/v1/media/late' });
  await flushPromises();
  expect(api.upload).toHaveBeenCalledTimes(1);
  expect(api.reply).not.toHaveBeenCalled();
});
