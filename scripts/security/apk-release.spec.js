// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  APK_DOWNLOAD_URL,
  APK_SIZE,
  APK_VERSION,
} from '../../src/constants/download.js';

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
