import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

/** CLIP zero-shot check of each finding close-up (produced by scripts/curb/clip_check.ts).
 * A confirmation signal only: it never adds, removes or re-ranks findings. */
export const ClipCheckSchema = z.strictObject({
  model: z.string().min(1),
  task: z.string().min(1),
  labels: z.array(z.string().min(1)).min(2),
  createdAt: z.iso.datetime(),
  findings: z.array(z.strictObject({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
    topLabel: z.string().min(1),
    damageScore: z.number().min(0).max(1),
    confirmsDamage: z.boolean(),
    scores: z.array(z.strictObject({ label: z.string().min(1), score: z.number().min(0).max(1) })).min(2),
  })).max(50),
});
export type ClipCheck = z.infer<typeof ClipCheckSchema>;

export async function loadClipCheck(): Promise<ClipCheck> {
  const text = await readFile(join(process.cwd(), 'src', 'data', 'curb', 'surveys', 'robertson-clip.json'), 'utf8');
  return ClipCheckSchema.parse(JSON.parse(text));
}

export async function getClipResponse(): Promise<Response> {
  const headers = { 'cache-control': 'no-store' };
  try {
    return Response.json({ data: await loadClipCheck() }, { headers });
  } catch {
    return Response.json({ error: { code: 'CLIP_UNAVAILABLE', message: 'The CLIP check could not be loaded.' } }, { status: 500, headers });
  }
}
