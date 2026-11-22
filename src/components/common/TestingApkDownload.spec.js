import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const availability = vi.hoisted(() => ({ newer: true }));
vi.mock('@/constants/testingDownload.js', async (importOriginal) => ({
  ...(await importOriginal()),
  get HAS_NEWER_TEST_APK() {
    return availability.newer;
  },
}));
import TestingApkDownload from './TestingApkDownload.vue';
import {
  TEST_APK_DOWNLOAD_URL,
  TEST_APK_FILE_NAME,
  TEST_APK_VERSION,
  TEST_RELEASE_URL,
} from '@/constants/testingDownload.js';

describe('optional Android testing download', () => {
  beforeEach(() => (availability.newer = true));
  it('hides the testing download after the stable release supersedes it', () => {
    availability.newer = false;
    const wrapper = mount(TestingApkDownload);
    expect(wrapper.find('aside').exists()).toBe(false);
    expect(wrapper.findAll('a')).toHaveLength(0);
    wrapper.unmount();
  });
  it('preserves the suffix, explains the choice and links to verified artifacts', () => {
    const wrapper = mount(TestingApkDownload);
    expect(wrapper.text()).toContain(`${TEST_APK_VERSION} 测试版`);
    expect(wrapper.text()).toContain('可自行选择');
    expect(wrapper.text()).toContain('将升级当前应用');
    const links = wrapper.findAll('a');
    expect(links[0].attributes('href')).toBe(TEST_APK_DOWNLOAD_URL);
    expect(links[0].attributes('download')).toBe(TEST_APK_FILE_NAME);
    expect(links[1].attributes('href')).toBe(TEST_RELEASE_URL);
    expect(links[1].attributes('rel')).toContain('noopener');
  });
});
