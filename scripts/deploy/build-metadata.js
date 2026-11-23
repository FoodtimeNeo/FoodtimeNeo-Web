import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function createBuildMetadata(id, bundle) {
  const entry = Object.values(bundle).find(
    (item) => item.type === 'chunk' && item.isEntry,
  );
  if (!entry) throw new Error('Production entry is missing');
  return {
    id,
    entry: '/' + entry.fileName,
    entrySha256: createHash('sha256').update(entry.code).digest('hex'),
  };
}

// Bundlers can still transform chunks after generateBundle. Hash the final bytes on disk.
export async function writeBuildMetadata(id, directory, bundle) {
  const metadata = createBuildMetadata(id, bundle);
  metadata.entrySha256 = createHash('sha256')
    .update(await readFile(join(directory, metadata.entry.slice(1))))
    .digest('hex');
  await writeFile(join(directory, 'version.json'), JSON.stringify(metadata));
}
