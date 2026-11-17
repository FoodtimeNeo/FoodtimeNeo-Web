import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const createCatalogCorrection = vi.fn();
const uploadImage = vi.fn();

vi.mock('@/api/correction.api.js', () => ({
  createCatalogCorrection: (...args) => createCatalogCorrection(...args),
}));
vi.mock('@/api/submission.api.js', () => ({
  uploadImage: (...args) => uploadImage(...args),
}));

import CatalogCorrectionDialog from './CatalogCorrectionDialog.vue';

function mountDialog(target = {}) {
  return mount(CatalogCorrectionDialog, {
    props: {
      modelValue: true,
      target: {
        type: 'dish',
        id: 'dish-1',
        revision: 3,
        name: '红烧肉',
        description: '旧介绍',
        price: 12.3,
        summary: '一食堂 · 面食档口 · 红烧肉',
        ...target,
      },
    },
    global: {
      stubs: {
        ElDialog: {
          template: '<div><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
}

describe('CatalogCorrectionDialog', () => {
  beforeEach(() => {
    createCatalogCorrection.mockReset();
    uploadImage.mockReset();
  });

  it('只提交显式勾选的字段，并保留目录基线版本', async () => {
    createCatalogCorrection.mockResolvedValue({ id: 'correction-1' });
    const wrapper = mountDialog();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(true);
    await wrapper.find('[aria-label="更正后的名称"]').setValue('红烧肉盖饭');
    await wrapper.find('#correction-reason').setValue('菜单已更新');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('提交纠错'))
      .trigger('click');
    await flushPromises();

    expect(createCatalogCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'dish',
        targetId: 'dish-1',
        baseRevision: 3,
        changedFields: ['name'],
        name: '红烧肉盖饭',
        reason: '菜单已更新',
        evidenceUrls: [],
      }),
    );
    expect(
      createCatalogCorrection.mock.calls[0][0].idempotencyKey,
    ).toBeTruthy();
    expect(wrapper.emitted('submitted')?.[0]?.[0]).toEqual({
      id: 'correction-1',
    });
  });

  it('清空价格时提交 null，表示价格未知', async () => {
    createCatalogCorrection.mockResolvedValue({ id: 'correction-2' });
    const wrapper = mountDialog();
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[2].setValue(true);
    await wrapper.find('[aria-label="更正后的价格"]').setValue('');
    await wrapper.find('#correction-reason').setValue('菜单没有标价');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('提交纠错'))
      .trigger('click');
    await flushPromises();

    expect(createCatalogCorrection).toHaveBeenCalledWith(
      expect.objectContaining({ changedFields: ['price'], price: null }),
    );
  });
});

it('单位可单独纠错，不隐式改动金额', async () => {
  createCatalogCorrection.mockResolvedValue({ id: 'unit-correction' });
  const wrapper = mountDialog({ priceUnit: 'serving' });
  const label = wrapper
    .findAll('label')
    .find((node) => node.text().includes('更正计价单位'));
  await label.get('input').setValue(true);
  await wrapper.get('select[aria-label="建议计价单位"]').setValue('jin');
  await wrapper.get('#correction-reason').setValue('菜单按斤计费');
  await wrapper
    .findAll('button')
    .find((node) => node.text().includes('提交纠错'))
    .trigger('click');
  await flushPromises();
  const payload = createCatalogCorrection.mock.calls.at(-1)[0];
  expect(payload.changedFields).toEqual(['priceUnit']);
  expect(payload.priceUnit).toBe('jin');
  expect(payload).not.toHaveProperty('price');
  wrapper.unmount();
});
