import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CommunityPins from './CommunityPins.vue';
it('置顶列表使用独立标题行，按服务器顺序进入原帖', async () => {
  const items = [
    { id: 'b', title: '校园食记乙', userDisplayName: '同学乙' },
    { id: 'a', title: '校园食记甲', userDisplayName: '同学甲' },
  ];
  const view = mount(CommunityPins, { props: { items } });
  expect(view.findAll('button').map((node) => node.text())).toEqual([
    '置顶校园食记乙@同学乙',
    '置顶校园食记甲@同学甲',
  ]);
  expect(view.find('img').exists()).toBe(false);
  await view.findAll('button')[1].trigger('click');
  expect(view.emitted('open')[0]).toEqual([items[1]]);
});
it('没有置顶内容时不留下空白分区', () => {
  expect(mount(CommunityPins).find('section').exists()).toBe(false);
});
