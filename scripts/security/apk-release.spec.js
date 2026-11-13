// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  APK_DOWNLOAD_URL,
  APK_SIZE,
  APK_VERSION,
} from '../../src/constants/download.js';
import {
  TEST_APK_DOWNLOAD_URL,
  TEST_APK_VERSION,
  TEST_APK_SIZE,
} from '../../src/constants/testingDownload.js';

describe('published Android APK', () => {
  it('ships the verified release bytes and matching download metadata', () => {
    const base = new URL('../../public/downloads/', import.meta.url);
    const bytes = readFileSync(new URL('FoodtimeNeo-Android.apk', base));
    const metadata = JSON.parse(
      readFileSync(new URL('FoodtimeNeo-Android.apk.json', base), 'utf8'),
    );
    const checksum = readFileSync(
      new URL('FoodtimeNeo-Android.apk.sha256', base),
      'utf8',
    )
      .trim()
      .split(/\s+/)[0];
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(hash).toBe(checksum);
    expect(hash).toBe(metadata.sha256);
    expect(bytes.length).toBe(metadata.bytes);
    expect(metadata.sourceRef).toBe('refs/heads/main');
    expect(metadata.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(metadata.releaseTag).toBe(`v${metadata.versionName}`);
    expect(APK_VERSION).toBe(metadata.releaseTag);
    expect(APK_SIZE).toBe(`${(bytes.length / 1_000_000).toFixed(1)} MB`);
    expect(
      new URL(APK_DOWNLOAD_URL, 'https://foodtime.example').searchParams.get(
        'v',
      ),
    ).toBe(`${metadata.versionName}-${metadata.versionCode}`);
  });
});

describe('published testing APK', () => {
  it('keeps a separate main-built prerelease with matching APK and delta bytes', () => {
    const base = new URL('../../public/downloads/testing/', import.meta.url);
    const read = (name) => readFileSync(new URL(name, base));
    const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
    const metadata = JSON.parse(read('FoodtimeNeo-Android.apk.json'));
    const manifest = JSON.parse(read('manifest.json'));
    const bytes = read('FoodtimeNeo-Android.apk');
    expect(TEST_APK_SIZE).toBe(`${(metadata.bytes / 1_000_000).toFixed(1)} MB`);
    expect(hash(bytes)).toBe(metadata.sha256);
    expect(
      read('FoodtimeNeo-Android.apk.sha256').toString().split(/\s+/)[0],
    ).toBe(metadata.sha256);
    expect(bytes.length).toBe(metadata.bytes);
    expect(metadata.sourceRef).toBe('refs/heads/main');
    expect(metadata.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(metadata.prerelease).toBe(true);
    expect(metadata.versionCode).toBeGreaterThan(22);
    expect(TEST_APK_VERSION).toBe(`v${metadata.versionName}`);
    expect(TEST_APK_VERSION).toContain('α');
    expect(TEST_APK_DOWNLOAD_URL).not.toBe(APK_DOWNLOAD_URL);
    expect(
      new URL(TEST_APK_DOWNLOAD_URL, 'https://example.test').searchParams.get(
        'v',
      ),
    ).toBe(`${metadata.versionName}-${metadata.versionCode}`);
    expect(manifest.sourceCommit).toBe(metadata.sourceCommit);
    expect(manifest.apk.sha256).toBe(metadata.sha256);
    expect(manifest.versionName).toBe(metadata.versionName);
    expect(manifest.versionCode).toBe(metadata.versionCode);
    expect(manifest.patches.some((patch) => patch.baseVersionCode === 22)).toBe(
      true,
    );
    for (const patch of manifest.patches) {
      const patchBytes = read(new URL(patch.url).pathname.split('/').pop());
      expect(hash(patchBytes)).toBe(patch.sha256);
      expect(patchBytes.length).toBe(patch.size);
    }
  });
});
