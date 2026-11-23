import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

let media, listener;
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  media = {
    matches: true,
    addEventListener: vi.fn((_, handler) => {
      listener = handler;
    }),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
});
afterEach(() => vi.unstubAllGlobals());
it('defaults to system, follows live changes and ignores them with an explicit choice', async () => {
  const { useAppearance } = await import('./useAppearance.js');
  const { appearance, setAppearance } = useAppearance();
  expect(appearance.value).toBe('system');
  expect(document.documentElement.dataset.theme).toBe('dark');
  media.matches = false;
  listener();
  expect(document.documentElement.dataset.theme).toBe('light');
  setAppearance('dark');
  expect(localStorage.getItem('foodtime-appearance')).toBe('dark');
  listener();
  expect(document.documentElement.dataset.theme).toBe('dark');
  setAppearance('system');
  expect(document.documentElement.dataset.theme).toBe('light');
  setAppearance('invalid');
  expect(appearance.value).toBe('system');
});
it('restores explicit mode and syncs a second tab without touching personal storage', async () => {
  localStorage.setItem('foodtime-appearance', 'light');
  localStorage.setItem('personal-data', 'keep');
  const { useAppearance } = await import('./useAppearance.js');
  const { appearance } = useAppearance();
  expect(document.documentElement.dataset.theme).toBe('light');
  localStorage.setItem('foodtime-appearance', 'dark');
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'foodtime-appearance',
      newValue: 'dark',
    }),
  );
  expect(appearance.value).toBe('dark');
  expect(localStorage.getItem('personal-data')).toBe('keep');
});
it('the profile picker offers and applies all three choices', async () => {
  const { default: AppearancePicker } =
    await import('@/components/base/AppearancePicker.vue');
  const wrapper = mount(AppearancePicker);
  expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
    '跟随系统',
    '浅色',
    '深色',
  ]);
  await wrapper.get('select').setValue('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  wrapper.unmount();
});
it('storage failure still permits switching for the current visit', async () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  const write = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('denied');
    });
  const { useAppearance } = await import('./useAppearance.js');
  const { setAppearance } = useAppearance();
  setAppearance('light');
  expect(document.documentElement.dataset.theme).toBe('light');
  read.mockRestore();
  write.mockRestore();
});
