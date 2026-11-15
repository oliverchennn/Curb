/** Official historical source acquisition. Run with `node --import tsx .../acquire.ts`.
 * Requires Poppler's pdfinfo on PATH (or PDFINFO). Source bytes stay outside Git.
 * This verifies a frozen source version; it does not verify its factual contents.
 */
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { link, lstat, mkdir, open, realpath, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

export const SOURCE_REFERENCE = Object.freeze({
  sourceId: 'smcccd-final-2020',
  url: 'https://smccd.edu/ada2020/19029%20SMCCCD%20ADA%20Self-Evaluation%20and%20Transition%20Plan%20FINAL%20Nov2020%20sm.pdf',
  bytes: 111_675_832,
  sha256: '01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8',
  pages: 4399,
});
export const CACHE_FILENAME = 'final-nov2020.pdf';
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const execFileAsync = promisify(execFile);

export type PdfIdentity = { bytes: number; sha256: string; pages: number };
export type AcquisitionReceipt = PdfIdentity & {
  sourceId: string;
  url: string;
  /** null means verification of an existing file, not a newly observed fetch. */
  retrievedAt: string | null;
  verification: 'matched_reference';
};
type Reference = Pick<typeof SOURCE_REFERENCE, 'sourceId' | 'url'> & PdfIdentity;
export type AcquisitionOptions = {
  fetch?: typeof globalThis.fetch;
  countPages?: (path: string) => Promise<number>;
  reference?: Reference;
  repositoryRoot?: string;
};

export async function countPdfPages(path: string): Promise<number> {
  const { stdout } = await execFileAsync(process.env.PDFINFO || 'pdfinfo', [path], {
    encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 60_000,
  });
  const match = /^Pages:\s+(\d+)\s*$/m.exec(stdout);
  const pages = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(pages) || pages <= 0) throw new Error('pdfinfo did not return a valid page count');
  return pages;
}

export async function inspectPdf(path: string, countPages = countPdfPages): Promise<PdfIdentity> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Source must be a regular file, not a symlink');
  const file = await open(path, 'r');
  try {
    const header = Buffer.alloc(5);
    await file.read(header, 0, 5, 0);
    if (header.toString('ascii') !== '%PDF-') throw new Error('Source does not have a PDF header');
  } finally { await file.close(); }
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  const pages = await countPages(path);
  if (!Number.isSafeInteger(pages) || pages <= 0) throw new Error('Invalid PDF page count');
  return { bytes, sha256: hash.digest('hex'), pages };
}

export async function verifyPdf(
  path: string,
  options: AcquisitionOptions & { retrievedAt?: string | null } = {},
): Promise<AcquisitionReceipt> {
  const expected = options.reference ?? SOURCE_REFERENCE;
  const actual = await inspectPdf(path, options.countPages);
  const mismatches = (['bytes', 'sha256', 'pages'] as const)
    .filter((key) => actual[key] !== expected[key]);
  if (mismatches.length) {
    throw new Error(`Source version review required: ${mismatches.join(', ')} mismatch; observed ${JSON.stringify(actual)}`);
  }
  const retrievedAt = options.retrievedAt ?? null;
  if (retrievedAt !== null && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(retrievedAt) || !Number.isFinite(Date.parse(retrievedAt)))) {
    throw new Error('retrievedAt must be a recorded UTC ISO timestamp');
  }
  return { sourceId: expected.sourceId, url: expected.url, retrievedAt, ...actual, verification: 'matched_reference' };
}

function inside(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

async function externalCache(path: string, repositoryRoot: string): Promise<string> {
  if (!isAbsolute(path)) throw new Error('Cache directory must be an absolute external path');
  // Resolve existing ancestors before mkdir so a repository path or symlink into it
  // is rejected before creating a directory there.
  let ancestor = resolve(path);
  const missing: string[] = [];
  while (true) {
    try { ancestor = await realpath(ancestor); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      missing.unshift(relative(parent, ancestor));
      ancestor = parent;
    }
  }
  const canonical = join(ancestor, ...missing);
  const root = await realpath(repositoryRoot);
  if (inside(canonical, root)) throw new Error('Source cache must be outside the repository');
  await mkdir(canonical, { recursive: true });
  return await realpath(canonical);
}

export async function acquirePdf(cacheDirectory: string, options: AcquisitionOptions = {}): Promise<AcquisitionReceipt> {
  const expected = options.reference ?? SOURCE_REFERENCE;
  const cache = await externalCache(cacheDirectory, options.repositoryRoot ?? REPOSITORY_ROOT);
  const destination = join(cache, CACHE_FILENAME);
  try {
    await lstat(destination);
    // Existing bytes are never overwritten or silently treated as newly fetched.
    return await verifyPdf(destination, options);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const response = await (options.fetch ?? globalThis.fetch)(expected.url, {
    redirect: 'error', signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok || !response.body) throw new Error(`Source download failed: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type');
  if (contentType && !/^(application\/pdf|application\/octet-stream)(?:;|$)/i.test(contentType)) {
    await response.body.cancel();
    throw new Error(`Source download has unexpected content type: ${contentType}`);
  }
  const temporary = join(cache, `.download-${randomUUID()}.pdf`);
  let received = 0;
  const sizeLimit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      callback(received > expected.bytes ? new Error('Source version review required: downloaded bytes exceed frozen size') : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), sizeLimit, createWriteStream(temporary, { flags: 'wx' }));
    const receipt = await verifyPdf(temporary, { ...options, retrievedAt: new Date().toISOString() });
    // Same-directory hard link publishes the complete verified bytes atomically
    // and fails EEXIST instead of overwriting a concurrent acquisition.
    await link(temporary, destination);
    return receipt;
  } finally { await rm(temporary, { force: true }); }
}

export async function main(args: string[]): Promise<void> {
  if (args.length !== 2 || !['--verify', '--out'].includes(args[0]) || !isAbsolute(args[1])) {
    throw new Error('Usage: acquire.ts --verify /absolute/report.pdf | --out /absolute/external-cache');
  }
  const receipt = args[0] === '--verify' ? await verifyPdf(args[1]) : await acquirePdf(args[1]);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
