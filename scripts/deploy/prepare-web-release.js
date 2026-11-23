import {
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  resolve,
  join,
  relative,
  isAbsolute,
  dirname,
  basename,
} from 'node:path';
import { fileURLToPath } from 'node:url';

function contains(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

async function verifyTree(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink())
    throw new Error('Symbolic links are not allowed in release input');
  if (stat.isDirectory())
    for (const entry of await readdir(path)) {
      if (/^(\.env(?:\..*)?|.*\.(?:jks|p12|key))$/i.test(entry))
        throw new Error(
          'Release input contains private configuration or signing material',
        );
      await verifyTree(join(path, entry));
    }
}

export async function verifyWebRelease(incoming) {
  await verifyTree(incoming);
  const metadata = JSON.parse(
    await readFile(join(incoming, 'version.json'), 'utf8'),
  );
  if (
    typeof metadata.id !== 'string' ||
    !/^[a-zA-Z0-9._-]{1,64}$/.test(metadata.id) ||
    !/^\/assets\/[a-zA-Z0-9._-]+\.js$/.test(metadata.entry) ||
    !/^[a-f0-9]{64}$/.test(metadata.entrySha256)
  )
    throw new Error('Invalid release metadata');
  const entry = await readFile(join(incoming, metadata.entry.slice(1)));
  if (createHash('sha256').update(entry).digest('hex') !== metadata.entrySha256)
    throw new Error('Entry checksum does not match release metadata');
  const html = await readFile(join(incoming, 'index.html'), 'utf8');
  if (!html.includes(`src="${metadata.entry}"`))
    throw new Error('HTML and entry do not match');
  return metadata;
}

/** Prepare a NEW directory. Retain old hashed assets; never edit the running site. */
export async function prepareWebRelease({ incoming, current, output }) {
  incoming = await realpath(resolve(incoming));
  output = resolve(output);
  output = join(await realpath(dirname(output)), basename(output));
  if (current) current = await realpath(resolve(current));
  if (
    contains(incoming, output) ||
    contains(output, incoming) ||
    (current && (contains(current, output) || contains(output, current)))
  )
    throw new Error(
      'Output must be separate from incoming/current directories',
    );
  const metadata = await verifyWebRelease(incoming);
  if (current) await verifyTree(join(current, 'assets'));
  // Non-recursive mkdir refuses an existing output; an active directory is never overwritten.
  await mkdir(output);
  for (const name of await readdir(incoming))
    await cp(join(incoming, name), join(output, name), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  let retained = 0;
  if (current)
    for (const name of await readdir(join(current, 'assets'))) {
      if (!/^[^/\\\r\n]+-[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9.]+$/u.test(name))
        continue;
      const old = join(current, 'assets', name),
        next = join(output, 'assets', name);
      if (!(await lstat(old)).isFile()) continue;
      let existing;
      try {
        existing = await readFile(next);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      const bytes = await readFile(old);
      if (existing) {
        if (!existing.equals(bytes))
          throw new Error('A hashed asset name refers to different bytes');
      } else {
        await cp(old, next, { force: false, errorOnExist: true });
        retained++;
      }
    }
  return { id: metadata.id, retained, output };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [incoming, output, current] = process.argv.slice(2);
  if (!incoming || !output)
    throw new Error(
      'Usage: node scripts/deploy/prepare-web-release.js <incoming-dist> <new-output> [current-site]',
    );
  const result = await prepareWebRelease({ incoming, output, current });
  process.stdout.write(JSON.stringify(result) + '\n');
}
