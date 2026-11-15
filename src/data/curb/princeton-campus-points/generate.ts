// Offline only: node --import tsx src/data/curb/princeton-campus-points/generate.ts [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildPublicPointCatalog } from './build-catalog';
import { POINT_SOURCE_SHA256 } from './contract';

const source = readFileSync(new URL('./point-source.json', import.meta.url));
if (createHash('sha256').update(source).digest('hex') !== POINT_SOURCE_SHA256) throw new Error('Exact point-source bytes changed');
const json = JSON.stringify(buildPublicPointCatalog(JSON.parse(source.toString('utf8'))), null, 2) + '\n';
const output = new URL('./catalog.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== json) throw new Error('Public catalog is stale');
} else writeFileSync(output, json);
console.log(JSON.stringify({ bytes: Buffer.byteLength(json), sha256: createHash('sha256').update(json).digest('hex'), check: process.argv.includes('--check') }));
