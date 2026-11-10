import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { invalidateMedia } from '@/utils/mediaLoader.js';
import CommunityPhotoDialog from './CommunityPhotoDialog.vue';

const images = [1, 2].map((id) => ({
  url: `/api/v1/media/00000000-0000-4000-8000-00000000000${id}`,
}));
let wrapper;
let request;
function render() {
  wrapper = mount(CommunityPhotoDialog, {
    attachTo: document.body,
    props: { index: 0, images, alt: '配图' },
    slots: { default: '<p>帖子正文摘要</p>' },
  });
}
const find = (selector) =>
  new DOMWrapper(document.querySelector(`.photo-dialog ${selector}`));
function response() {
  return {
    ok: true,
    headers: new Headers({ 'Content-Type': 'image/jpeg' }),
    blob: async () => new Blob(['photo'], { type: 'image/jpeg' }),
  };
}
beforeEach(() => {
  request = vi.fn(async () => response());
  vi.stubGlobal('fetch', request);
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL() {
        return `blob:${crypto.randomUUID()}`;
      }
      static revokeObjectURL() {}
    },
  );
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value() {
        this.open = false;
      },
    },
  });
});
afterEach(() => {
  wrapper?.unmount();
  invalidateMedia();
  vi.unstubAllGlobals();
  delete HTMLDialogElement.prototype.showModal;
  delete HTMLDialogElement.prototype.close;
  vi.useRealTimers();
});

it('打开和翻页只请求缩略图，原图成功解码后才替换当前缩略图', async () => {
  render();
  await flushPromises();
  const thumbnail = find('img').element;
  expect(request.mock.calls.map(([url]) => url)).toEqual([
    `${images[0].url}?size=thumb`,
  ]);
  await find('.photo-dialog__original button').trigger('click');
  await flushPromises();
  const original = find('img:nth-of-type(2)');
  expect(original.isVisible()).toBe(false);
  expect(find('img').element).toBe(thumbnail);
  await original.trigger('load');
  expect(original.isVisible()).toBe(true);
  expect(find('.photo-dialog__original button').text()).toBe('已加载原图');
  await wrapper.setProps({ index: 1 });
  await flushPromises();
  expect(request.mock.calls.map(([url]) => url)).toEqual([
    `${images[0].url}?size=thumb`,
    `${images[0].url}?size=full`,
    `${images[1].url}?size=thumb`,
  ]);
  expect(find('.photo-dialog__original button').text()).toBe('加载原图');
});

it('原图失败可重试，切换图片取消上张未完成的请求', async () => {
  render();
  await flushPromises();
  const thumbnail = find('img').element;
  request.mockRejectedValueOnce(new Error('断开'));
  const originalButton = () => find('.photo-dialog__original button');
  await originalButton().trigger('click');
  await flushPromises();
  expect(originalButton().text()).toBe('重试加载原图');
  expect(find('img').element).toBe(thumbnail);
  let originalSignal;
  request.mockImplementationOnce((_, options) => {
    originalSignal = options.signal;
    return new Promise(() => {});
  });
  await originalButton().trigger('click');
  await flushPromises();
  await wrapper.setProps({ index: 1 });
  expect(originalSignal.aborted).toBe(true);
  expect(originalButton().text()).toBe('加载原图');
});

it('收起摘要保留画布，双击缩放并恢复，单击关闭', async () => {
  render();
  await flushPromises();
  vi.useFakeTimers();
  const canvas = find('.photo-dialog__canvas');
  await find('.photo-dialog__toggle').trigger('click');
  expect(find('.photo-dialog__toggle').attributes('aria-expanded')).toBe(
    'false',
  );
  expect(find('.photo-dialog__details').isVisible()).toBe(false);
  expect(find('.photo-dialog__canvas').element).toBe(canvas.element);
  async function tap() {
    const event = { button: 0, pointerId: 1, clientX: 30, clientY: 35 };
    await canvas.trigger('pointerdown', event);
    await canvas.trigger('pointerup', event);
  }
  await tap();
  await tap();
  expect(find('img').attributes('style')).toContain('scale(2.5)');
  expect(wrapper.emitted('close')).toBeUndefined();
  await tap();
  await tap();
  expect(find('img').attributes('style')).toContain('scale(1)');
  await tap();
  await vi.advanceTimersByTimeAsync(300);
  expect(wrapper.emitted('close')).toHaveLength(1);
});
