import { resolve } from 'node:path';
import { verifyWebRelease } from './prepare-web-release.js';

const metadata = await verifyWebRelease(resolve(process.argv[2] || 'dist'));
process.stdout.write(`Verified final build entry: ${metadata.id}\n`);
