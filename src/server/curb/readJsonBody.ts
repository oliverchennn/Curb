type JsonBody = { ok: true; value: unknown } | { ok: false; reason: 'invalid' | 'too-large' };

/** Read JSON under an actual byte bound, including chunked bodies and untrusted length headers. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBody> {
  const invalid = { ok: false, reason: 'invalid' } as const;
  const tooLarge = { ok: false, reason: 'too-large' } as const;
  const length = request.headers.get('content-length');
  if (length !== null) {
    if (!/^\d+$/.test(length)) return invalid;
    if (Number(length) > maxBytes) return tooLarge;
  }
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json' || !request.body) return invalid;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        // Do not await a slow producer's cancellation acknowledgement.
        void reader.cancel().catch(() => {});
        return tooLarge;
      }
      chunks.push(value);
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, total));
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return invalid;
  } finally {
    reader.releaseLock();
  }
}

// A selection contains only bounded IDs, a version and (for plans) one amount.
// Keep ample room for future selection fields without buffering arbitrary uploads.
export const MAX_SELECTION_BODY_BYTES = 16 * 1024;
