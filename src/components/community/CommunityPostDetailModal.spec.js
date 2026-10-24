import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CommunityPostDetailModal from './CommunityPostDetailModal.vue';
describe('帖子详情弹窗', () => {
  it('打开时复用详情组件，关闭交还焦点由 ElDialog 管理', async () => {
    const wrapper = mount(CommunityPostDetailModal, {
      props: { postId: 'p1', modelValue: true },
      global: {
        stubs: {
          CommunityPostContent: {
            props: ['postId'],
            template: '<div class="post-content-stub">{{ postId }}</div>',
          },
          ElDialog: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<div v-if="modelValue"><slot/><button @click="$emit(\'update:modelValue\', false)">关闭</button></div>',
          },
        },
      },
    });
    expect(wrapper.text()).toContain('p1');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false]);
  });
});
