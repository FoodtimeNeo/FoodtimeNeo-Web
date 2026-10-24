import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CommunityImageViewer from './CommunityImageViewer.vue';

const images = Array.from({ length: 9 }, (_, index) => ({
  id: `image-${index}`,
  url: `/media/${index}.jpg`,
}));
let wrapper;

function render(items = images) {
  wrapper = mount(CommunityImageViewer, {
    props: { images: items, alt: '九图食记' },
    global: { stubs: { ElImageViewer: true } },
  });
  return wrapper;
}

afterEach(() => wrapper?.unmount());

describe('CommunityImageViewer', () => {
  it('九图均可直接切换，当前页码和放大查看的起始图片一致', async () => {
    render();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(9);
    for (let index = 0; index < images.length; index += 1) {
      await tabs[index].trigger('click');
      expect(tabs[index].attributes('aria-selected')).toBe('true');
      expect(wrapper.get('[role="status"]').text()).toBe(`${index + 1} / 9`);
      expect(
        wrapper.get('.community-image-viewer__track').attributes('style'),
      ).toContain(`translateX(-${index * 100}%)`);
    }
    await wrapper
      .get('.community-image-viewer__stage')
      .trigger('keydown.enter');
    expect(
      wrapper.getComponent({ name: 'ElImageViewer' }).props('initialIndex'),
    ).toBe(8);
  });

  it('键盘和前后按钮不越过首尾图片', async () => {
    render();
    const stage = wrapper.get('.community-image-viewer__stage');
    await stage.trigger('keydown.left');
    expect(wrapper.find('[aria-label="上一张图片"]').exists()).toBe(false);
    await wrapper.get('[aria-label="下一张图片"]').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toBe('2 / 9');
    await wrapper.findAll('[role="tab"]')[8].trigger('click');
    await stage.trigger('keydown.right');
    expect(wrapper.get('[role="status"]').text()).toBe('9 / 9');
    expect(wrapper.find('[aria-label="下一张图片"]').exists()).toBe(false);
    await wrapper.get('[aria-label="上一张图片"]').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toBe('8 / 9');
  });

  it('触摸左划与右划切换图片，小幅移动不翻页', async () => {
    render();
    const stage = wrapper.get('.community-image-viewer__stage');
    for (const [endX, expected] of [
      [90, 1],
      [20, 2],
      [170, 1],
    ]) {
      await stage.trigger('touchstart', { touches: [{ clientX: 100 }] });
      await stage.trigger('touchmove', { touches: [{ clientX: endX }] });
      await stage.trigger('touchend');
      expect(wrapper.get('[role="status"]').text()).toBe(`${expected} / 9`);
    }
  });

  it('单图不显示多图导航，仍支持放大', async () => {
    render(images.slice(0, 1));
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    await wrapper.get('.community-image-viewer__slide').trigger('click');
    expect(wrapper.findComponent({ name: 'ElImageViewer' }).exists()).toBe(
      true,
    );
  });

  it('没有配图时显示空态，不能打开放大层', async () => {
    render([]);
    expect(wrapper.text()).toContain('暂无配图');
    await wrapper
      .get('.community-image-viewer__stage')
      .trigger('keydown.enter');
    expect(wrapper.findComponent({ name: 'ElImageViewer' }).exists()).toBe(
      false,
    );
  });

  it('帖子互动刷新产生相同图片的新数组时保留图片位置和放大层', async () => {
    render();
    await wrapper.findAll('[role="tab"]')[8].trigger('click');
    await wrapper
      .get('.community-image-viewer__stage')
      .trigger('keydown.enter');
    await wrapper.setProps({ images: images.map((image) => ({ ...image })) });
    expect(wrapper.get('[role="status"]').text()).toBe('9 / 9');
    expect(wrapper.findComponent({ name: 'ElImageViewer' }).exists()).toBe(
      true,
    );

    await wrapper.setProps({ images: images.slice(0, 3) });
    expect(wrapper.get('[role="status"]').text()).toBe('1 / 3');
    expect(wrapper.findComponent({ name: 'ElImageViewer' }).exists()).toBe(
      false,
    );
  });
});
