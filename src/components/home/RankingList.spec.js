import { describe, expect, it } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import RankingList from './RankingList.vue';

const items = [
  {
    rank: 1,
    dishId: 'd1',
    canteenId: 'c1',
    dishName: '红烧牛肉面',
    score: 4.9,
    stamp: '必吃',
  },
  {
    rank: 4,
    dishId: 'd4',
    canteenId: 'c2',
    dishName: '煲仔饭',
    score: 4.3,
    stamp: '推荐',
  },
];

function mountList() {
  return mount(RankingList, {
    props: { items },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('RankingList', () => {
  it('展示名次、菜名、印章与分数', () => {
    const wrapper = mountList();
    const text = wrapper.text();
    expect(text).toContain('红烧牛肉面');
    expect(text).toContain('必吃');
    expect(text).toContain('4.9');
  });

  it('前三名高亮', () => {
    const wrapper = mountList();
    const indices = wrapper.findAll('.ranking__index');
    expect(indices[0].classes()).toContain('is-top');
    expect(indices[1].classes()).not.toContain('is-top');
  });

  it('每一项链接指向对应菜品详情', () => {
    const wrapper = mountList();
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[0].props('to')).toEqual({
      name: 'dishDetail',
      params: { canteenId: 'c1', dishId: 'd1' },
    });
  });
});
