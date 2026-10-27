import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const createCommunityPost = vi.fn();
const uploadImage = vi.fn();

vi.mock('@/api/community.api.js', () => ({
  createCommunityPost: (...args) => createCommunityPost(...args),
}));

vi.mock('@/api/submission.api.js', () => ({
  uploadImage: (...args) => uploadImage(...args),
}));

import PostCreateModal from './PostCreateModal.vue';

function mountModal(props = {}) {
  return mount(PostCreateModal, {
    props: {
      modelValue: true,
      ...props,
    },
    global: {
      stubs: {
        ElDialog: {
          template: '<div class="el-dialog-stub"><slot /></div>',
        },
      },
    },
  });
}

describe('PostCreateModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    createCommunityPost.mockReset();
    uploadImage.mockReset();
  });

  it('不存在链接输入框和快捷预设配图，展示手账真实图片上传区', () => {
    const wrapper = mountModal();
    // 确保已彻底删除链接输入与快捷预设
    expect(wrapper.text()).not.toContain('粘贴图片 HTTPS 链接');
    expect(wrapper.text()).not.toContain('快捷选用手账美食配图');
    // 包含真实实拍上传提示
    expect(wrapper.text()).toContain('点击或拖拽上传实拍照片');
  });

  it('支持接收 initialData 预填数据', () => {
    const wrapper = mountModal({
      initialData: {
        title: '学一瓦罐汤',
        content: '排骨软烂入味',
        images: ['https://example.com/soup.jpg'],
      },
    });

    const titleInput = wrapper.find('#post-title');
    expect(titleInput.element.value).toBe('学一瓦罐汤');

    const textarea = wrapper.find('#post-content');
    expect(textarea.element.value).toBe('排骨软烂入味');

    // 预览图列表中展示预填图片
    const imgs = wrapper.findAll('.photo-card img');
    expect(imgs.length).toBe(1);
    expect(imgs[0].attributes('src')).toBe('https://example.com/soup.jpg');
  });

  it('可以通过文件上传添加图片并在提交时正常发帖', async () => {
    uploadImage.mockResolvedValue({ imageUrl: '/api/v1/media/img-real-1' });
    createCommunityPost.mockResolvedValue({
      id: 'post-new-1',
      title: '自制三明治',
      status: 'pending',
    });

    const wrapper = mountModal();

    await wrapper.find('#post-title').setValue('自制三明治');
    await wrapper.find('#post-content').setValue('全麦面包配煎蛋，美味健康！');

    // 模拟文件选择
    const fileInput = wrapper.find('input[type="file"]');
    const dummyFile = new File(['dummy content'], 'food.jpg', {
      type: 'image/jpeg',
    });

    Object.defineProperty(fileInput.element, 'files', {
      value: [dummyFile],
      writable: true,
    });
    await fileInput.trigger('change');

    // 列表中展示了该图片卡片
    expect(wrapper.findAll('.photo-card').length).toBe(1);

    // 提交表单
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // 验证调用了 uploadImage 和 createCommunityPost
    expect(uploadImage).toHaveBeenCalledWith(dummyFile);
    expect(createCommunityPost).toHaveBeenCalledWith({
      clientRequestId: expect.any(String),
      title: '自制三明治',
      content: '全麦面包配煎蛋，美味健康！',
      images: ['/api/v1/media/img-real-1'],
    });

    // 发射了 created 事件
    expect(wrapper.emitted('created')).toBeTruthy();
  });

  it('上传失败保留草稿且不会提交本地预览', async () => {
    uploadImage.mockRejectedValue(new Error('上传失败'));
    const wrapper = mountModal();
    await wrapper.find('#post-title').setValue('标题');
    await wrapper.find('#post-content').setValue('正文');
    const input = wrapper.find('input[type="file"]');
    Object.defineProperty(input.element, 'files', {
      value: [new File(['x'], 'photo.png', { type: 'image/png' })],
    });
    await input.trigger('change');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createCommunityPost).not.toHaveBeenCalled();
    expect(wrapper.find('#post-content').element.value).toBe('正文');
    expect(wrapper.emitted('created')).toBeUndefined();
  });

  it('支持删除已选图片', async () => {
    const wrapper = mountModal({
      initialData: {
        images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
      },
    });

    expect(wrapper.findAll('.photo-card').length).toBe(2);

    // 点击删除第一张
    const removeBtn = wrapper.find('.photo-card__remove-btn');
    await removeBtn.trigger('click');

    expect(wrapper.findAll('.photo-card').length).toBe(1);
  });
});
