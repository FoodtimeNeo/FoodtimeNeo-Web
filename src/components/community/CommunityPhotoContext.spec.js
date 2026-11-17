import { afterEach, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CommunityPhotoContext from './CommunityPhotoContext.vue';

let wrapper;
const post = {
  status: 'approved',
  title: '食记',
  content: '正文',
  likeCount: 0,
  commentCount: 2,
};
afterEach(() => wrapper?.unmount());

it('图标内点击仍触发对应的分享、评论和点赞操作', async () => {
  wrapper = mount(CommunityPhotoContext, { props: { post } });
  const actions = wrapper.findAll('.photo-context__actions button');
  for (let index = 0; index < actions.length; index++) {
    await actions[index].get('svg').trigger('click');
    expect(wrapper.emitted(['share', 'comment', 'like'][index])).toHaveLength(
      1,
    );
  }
  expect(actions[1].text()).toBe('评论 2');
});

it('点赞的选中、计数和忙碌状态保留，禁用期间不重复触发', async () => {
  wrapper = mount(CommunityPhotoContext, { props: { post, likeBusy: true } });
  const like = wrapper.get('[aria-pressed]');
  expect(like.element.disabled).toBe(true);
  await like.trigger('click');
  expect(wrapper.emitted('like')).toBeUndefined();
  await wrapper.setProps({
    post: { ...post, likedByMe: true, likeCount: 12 },
    likeBusy: false,
  });
  expect(like.attributes('aria-pressed')).toBe('true');
  expect(like.text()).toBe('已赞 12');
  await like.trigger('click');
  expect(wrapper.emitted('like')).toHaveLength(1);
});

it('待审核预览不新增互动入口，仍可返回帖子', async () => {
  wrapper = mount(CommunityPhotoContext, {
    props: { post: { ...post, status: 'pending' } },
  });
  expect(wrapper.find('.photo-context__actions').exists()).toBe(false);
  await wrapper.get('.photo-context__post').trigger('click');
  expect(wrapper.emitted('post')).toHaveLength(1);
});
