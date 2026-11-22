// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createBuildMetadata, writeBuildMetadata } from './build-metadata.js';
import { prepareWebRelease } from './prepare-web-release.js';

let root, incoming, current, output;
const parent = resolve(
  process.env.FOODTIME_TEST_OUTPUT ||
    join(tmpdir(), 'foodtime-web-deploy-tests'),
);
beforeEach(async () => {
  await mkdir(parent, { recursive: true });
  root = await mkdtemp(join(parent, 'release-'));
  incoming = join(root, 'incoming');
  current = join(root, 'current');
  output = join(root, 'prepared');
  await mkdir(join(incoming, 'assets'), { recursive: true });
  await mkdir(join(current, 'assets'), { recursive: true });
  const code = 'const build="new-build";';
  const metadata = createBuildMetadata('new-build', {
    entry: {
      type: 'chunk',
      isEntry: true,
      fileName: 'assets/index-new12345.js',
      code,
    },
  });
  await writeFile(join(incoming, 'version.json'), JSON.stringify(metadata));
  await writeFile(
    join(incoming, 'index.html'),
    `<script type="module" src="${metadata.entry}"></script>`,
  );
  await writeFile(join(incoming, 'assets/index-new12345.js'), code);
  await writeFile(join(current, 'assets/index-old12345.js'), 'old entry');
  await writeFile(join(current, 'assets/page-old12345.js'), 'old lazy page');
  await writeFile(
    join(current, 'assets/unhashed.js'),
    'not a retained hash asset',
  );
});
afterEach(async () => {
  if (
    (root && resolve(root).startsWith(parent + '\\')) ||
    (root && resolve(root).startsWith(parent + '/'))
  )
    await rm(root, { recursive: true, force: true });
});

describe('safe static deployment staging', () => {
  it('hashes the final disk bytes even if the bundler transformed the in-memory chunk', async () => {
    await writeBuildMetadata('new-build', incoming, {
      entry: {
        type: 'chunk',
        isEntry: true,
        fileName: 'assets/index-new12345.js',
        code: 'before final transform',
      },
    });
    await expect(
      prepareWebRelease({ incoming, current, output }),
    ).resolves.toMatchObject({ id: 'new-build' });
  });
  it('retains old hashed lazy assets and leaves the live site unchanged', async () => {
    const result = await prepareWebRelease({ incoming, current, output });
    expect(result.retained).toBe(2);
    expect(
      await readFile(join(output, 'assets/page-old12345.js'), 'utf8'),
    ).toBe('old lazy page');
    expect(
      await readFile(join(current, 'assets/index-old12345.js'), 'utf8'),
    ).toBe('old entry');
    expect(await readFile(join(output, 'index.html'), 'utf8')).toContain(
      'index-new12345.js',
    );
  });
  it('rejects partial upload bytes and mismatched HTML before creating output', async () => {
    await writeFile(join(incoming, 'assets/index-new12345.js'), 'incomplete');
    await expect(
      prepareWebRelease({ incoming, current, output }),
    ).rejects.toThrow('checksum');
  });
  it('refuses active/existing destinations and hash-name collisions', async () => {
    await expect(
      prepareWebRelease({ incoming, current, output: current }),
    ).rejects.toThrow('separate');
    await mkdir(output);
    await expect(
      prepareWebRelease({ incoming, current, output }),
    ).rejects.toThrow();
    await writeFile(join(current, 'assets/index-new12345.js'), 'wrong bytes');
    await expect(
      prepareWebRelease({ incoming, current, output: join(root, 'other') }),
    ).rejects.toThrow('different bytes');
  });
  it('does not copy private configuration into a release', async () => {
    await writeFile(join(incoming, '.env'), 'private');
    await expect(
      prepareWebRelease({ incoming, current, output }),
    ).rejects.toThrow('private configuration');
  });
});
