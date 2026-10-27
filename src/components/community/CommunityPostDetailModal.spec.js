import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CommunityPostDetailModal from './CommunityPostDetailModal.vue';

describe('CommunityPostDetailModal', () => {
  it('打开时渲染毛玻璃弹窗与详情内容，关闭时触发 update:modelValue', async () => {
    const wrapper = mount(CommunityPostDetailModal, {
      props: { postId: 'p1', modelValue: true },
      global: {
        stubs: {
          Teleport: true,
          CommunityPostContent: {
            props: ['postId'],
            template: '<div class="post-content-stub">{{ postId }}</div>',
          },
        },
      },
    });

    expect(wrapper.find('.redbook-modal').exists()).toBe(true);
    expect(wrapper.find('.redbook-modal__close-btn').exists()).toBe(true);
    expect(wrapper.text()).toContain('p1');

    await wrapper.find('.redbook-modal__close-btn').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]);
  });
});
