import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TestingApkDownload from './TestingApkDownload.vue';
import {
  TEST_APK_DOWNLOAD_URL,
  TEST_APK_FILE_NAME,
  TEST_APK_VERSION,
  TEST_RELEASE_URL,
} from '@/constants/testingDownload.js';

describe('optional Android testing download', () => {
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
