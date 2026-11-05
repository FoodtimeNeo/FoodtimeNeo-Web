import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ProfileEditor from './ProfileEditor.vue';

const api = vi.hoisted(() => ({
  update: vi.fn(),
  upload: vi.fn(),
  auth: { user: null },
}));
vi.mock('@/api/profile.api.js', () => ({
  updateOwnProfile: api.update,
  uploadAvatar: api.upload,
}));
vi.mock('@/components/profile/AvatarCropper.vue', () => ({
  default: {
    name: 'AvatarCropper',
    props: ['file'],
    emits: ['confirm', 'cancel'],
    template: '<div class="cropper-stub" />',
  },
}));
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => api.auth }));
const avatar = '/api/v1/media/11111111-1111-1111-1111-111111111111';
const user = {
  id: 'user',
  displayName: '同学',
  avatarUrl: avatar,
  role: 'user',
};
const updated = { ...user, displayName: '新昵称' };
let wrapper;
beforeEach(() => {
  vi.resetAllMocks();
  api.auth.user = { ...user };
  api.update.mockResolvedValue({ ...updated });
  api.upload.mockResolvedValue({
    imageUrl: '/api/v1/media/22222222-2222-2222-2222-222222222222',
  });
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width: 50, height: 50, close: vi.fn() }),
  );
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:avatar');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  wrapper = mount(ProfileEditor, { props: { user: { ...user } } });
});
afterEach(() => {
  wrapper.unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function choose(type = 'image/png', accept = true) {
  const input = wrapper.get('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: [new File(['image'], 'avatar.png', { type })],
    configurable: true,
  });
  await input.trigger('change');
  await flushPromises();
  const selected = input.element.files[0];
  if (accept && wrapper.findComponent({ name: 'AvatarCropper' }).exists()) {
    wrapper
      .findComponent({ name: 'AvatarCropper' })
      .vm.$emit('confirm', selected);
    await flushPromises();
  }
  return selected;
}
async function submit() {
  await wrapper.get('form').trigger('submit');
  await flushPromises();
}

describe('个人昵称与头像编辑', () => {
  it('只显示一个选图入口，取消再次裁剪保留已有草稿', async () => {
    expect(wrapper.get('input[type="file"]').attributes()).toHaveProperty(
      'hidden',
    );
    expect(
      wrapper.findAll('button').filter((b) => b.text() === '选择新头像'),
    ).toHaveLength(1);
    const previous = await choose();
    await choose('image/png', false);
    wrapper.findComponent({ name: 'AvatarCropper' }).vm.$emit('cancel');
    await flushPromises();
    await submit();
    expect(api.upload).toHaveBeenCalledWith(previous);
  });
  it('仅修改昵称时保留当前头像，并返回服务端资料', async () => {
    await wrapper.get('input[name="displayName"]').setValue('  新昵称  ');
    await submit();
    expect(api.update).toHaveBeenCalledWith({
      displayName: '新昵称',
      avatarUrl: avatar,
    });
    expect(api.upload).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')[0]).toEqual([updated]);
  });
  it('头像先上传，再用同站引用保存；更新失败可重试且不重复上传', async () => {
    await choose();
    api.update.mockRejectedValueOnce(new Error('保存失败'));
    await submit();
    expect(wrapper.text()).toContain('保存失败');
    expect(wrapper.emitted('saved')).toBeUndefined();
    expect(wrapper.get('img').attributes('src')).toBe('blob:avatar');
    await submit();
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledTimes(2);
    expect(api.update).toHaveBeenLastCalledWith({
      displayName: '同学',
      avatarUrl: '/api/v1/media/22222222-2222-2222-2222-222222222222',
    });
    expect(wrapper.emitted('saved')).toHaveLength(1);
  });
  it('空白昵称和非法图片均不会提交资料', async () => {
    await wrapper.get('input[name="displayName"]').setValue('   ');
    await submit();
    expect(wrapper.text()).toContain('1–50');
    await wrapper.get('input[name="displayName"]').setValue('昵称');
    await choose('image/gif');
    await submit();
    expect(wrapper.text()).toContain('只支持 JPEG 或 PNG');
    expect(api.update).not.toHaveBeenCalled();
    expect(api.upload).not.toHaveBeenCalled();
  });
  it('显式移除头像发送 null，取消编辑不写入', async () => {
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await submit();
    expect(api.update).toHaveBeenCalledWith({
      displayName: '同学',
      avatarUrl: null,
    });
    api.update.mockClear();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '取消')
      .trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(api.update).not.toHaveBeenCalled();
  });
  it('上传失败保留输入且不更新资料', async () => {
    await choose();
    api.upload.mockRejectedValueOnce(new Error('上传失败'));
    await submit();
    expect(wrapper.text()).toContain('上传失败');
    expect(wrapper.get('input[name="displayName"]').element.value).toBe('同学');
    expect(api.update).not.toHaveBeenCalled();
  });
  it('上传期间切换账号不会写入另一个账号的资料', async () => {
    await choose();
    let resolve;
    api.upload.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(api.upload).toHaveBeenCalledTimes(1);
    api.auth.user = { ...user, id: 'other' };
    resolve({ imageUrl: avatar });
    await flushPromises();
    expect(api.update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('登录状态已变化');
  });
});
