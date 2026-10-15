import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ImageFileField from './ImageFileField.vue';

let wrapper;
let decode;
beforeEach(() => {
  decode = vi.fn();
  vi.stubGlobal('createImageBitmap', decode);
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:preview'),
    revokeObjectURL: vi.fn(),
  });
});

it('清除正在检查的图片会终止等待，迟到解码不能恢复选择', async () => {
  let finish;
  decode.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  wrapper = mount(ImageFileField, { props: { required: false } });
  await choose(new File(['image'], 'a.png', { type: 'image/png' }));
  await wrapper.get('button').trigger('click');
  expect(wrapper.text()).not.toContain('正在检查图片');
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  finish({ width: 20, height: 20, close: vi.fn() });
  await flushPromises();
  expect(wrapper.find('img').exists()).toBe(false);
  expect(wrapper.emitted('checking').map(([value]) => value)).toEqual([
    true,
    false,
  ]);
});

it('有效图片有预览，清除时释放预览并返回空选择', async () => {
  decode.mockResolvedValue({ width: 20, height: 20, close: vi.fn() });
  const file = new File(['image'], 'a.png', { type: 'image/png' });
  wrapper = mount(ImageFileField);
  await choose(file);
  await flushPromises();
  expect(wrapper.get('img').attributes('alt')).toBe('所选图片预览');
  expect(wrapper.emitted('change').at(-1)).toEqual([file]);
  await wrapper.get('button').trigger('click');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  expect(wrapper.emitted('change').at(-1)).toEqual([null]);
  expect(wrapper.find('img').exists()).toBe(false);
});

it('图片限制错误关联输入框，不能将超像素图片传给投稿表单', async () => {
  decode.mockResolvedValue({ width: 5000, height: 5000, close: vi.fn() });
  wrapper = mount(ImageFileField);
  await choose(new File(['image'], 'a.png', { type: 'image/png' }));
  await flushPromises();
  const error = wrapper.get('[role="alert"]');
  expect(error.text()).toContain('2000 万像素');
  expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
  expect(wrapper.get('input').attributes('aria-describedby')).toContain(
    error.attributes('id'),
  );
  expect(wrapper.emitted('change').every(([value]) => value === null)).toBe(
    true,
  );
});

it('选填图片清空时不提示必填错误，外部校验消息仍可被朗读', async () => {
  wrapper = mount(ImageFileField, { props: { required: false } });
  await choose(null);
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  await wrapper.setProps({ validationMessage: '请选择有效的图片' });
  expect(wrapper.get('[role="alert"]').text()).toBe('请选择有效的图片');
  expect(wrapper.get('input').attributes('aria-required')).toBe('false');
});
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function choose(file) {
  const input = wrapper.get('input');
  Object.defineProperty(input.element, 'files', {
    value: file ? [file] : [],
    configurable: true,
  });
  await input.trigger('change');
}

it('新选择无效文件时结束旧图片检查，旧解码不能覆盖错误或返回文件', async () => {
  let finish;
  decode.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  wrapper = mount(ImageFileField);
  await choose(new File(['image'], 'a.png', { type: 'image/png' }));
  expect(wrapper.text()).toContain('正在检查图片');
  await choose(new File(['text'], 'b.txt', { type: 'text/plain' }));
  expect(wrapper.text()).not.toContain('正在检查图片');
  expect(wrapper.get('[role="alert"]').text()).toContain('JPEG');
  const close = vi.fn();
  finish({ width: 32, height: 32, close });
  await flushPromises();
  expect(close).toHaveBeenCalledOnce();
  expect(wrapper.emitted('change').every(([value]) => value === null)).toBe(
    true,
  );
  expect(wrapper.find('img').exists()).toBe(false);
});
