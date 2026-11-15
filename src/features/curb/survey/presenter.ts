import { z } from 'zod';
import { BoxSchema, type Finding, type Survey } from '../../../contracts/curb/survey';

/** Display-only evidence. Never apply these fields to the survey or its exports. */
export type PresenterFrame = {
  findingId: string;
  frame: number;
  seconds: number;
  cropSrc: string;
  fullFrameSrc: string | null;
  fallbackReason: string | null;
  alternate: boolean;
  rationale: string;
};

const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const FrameNumber = z.number().int().nonnegative().max(0xffff_ffff);
const FrameSchema = z.strictObject({
  findingId: z.string(),
  canonicalFrame: FrameNumber,
  frame: FrameNumber,
  seconds: z.number().finite().nonnegative(),
  decision: z.enum(['retain', 'change']),
  trackSpan: z.tuple([FrameNumber, FrameNumber]),
  trackSha256: Hash,
  normalizedBox: BoxSchema,
  cropRectPixels: z.strictObject({
    x: z.number().int().nonnegative(), y: z.number().int().nonnegative(),
    width: z.number().int().positive(), height: z.number().int().positive(),
  }),
  fullFrameSrc: z.string(),
  cropSrc: z.string(),
  fullFrameSha256: Hash,
  cropSha256: Hash,
  rationale: z.string().trim().min(1).max(4000),
});

// Parse entries separately so a missing or damaged entry cannot substitute an
// unrelated finding's crop, or prevent another finding from using valid evidence.
const MetadataSchema = z.strictObject({
  schemaVersion: z.literal(1),
  surveyId: z.string(),
  media: z.strictObject({
    src: z.string(), sourceSrc: z.string(), originalSha256: Hash, normalizedSha256: Hash,
    width: z.number().int().positive(), height: z.number().int().positive(),
    fps: z.number().positive(), frameCount: z.number().int().positive(),
  }),
  trackFingerprintAlgorithm: z.literal('sha256-u32le-f64le-v1'),
  trackDataSha256: Hash,
  frames: z.array(z.unknown()).max(50),
});

export type PresenterFrameMetadata = z.infer<typeof FrameSchema>;
export type PresenterMetadata = Omit<z.infer<typeof MetadataSchema>, 'frames'> & { frames: PresenterFrameMetadata[] };

export function canonicalPresenterFrame(
  survey: Survey,
  finding: Finding,
  reason = 'Presenter source frame unavailable; showing canonical evidence.',
): PresenterFrame {
  const frame = Math.floor(finding.evidenceTime * survey.media.fps + 1e-6);
  return {
    findingId: finding.id, frame, seconds: frame / survey.media.fps,
    cropSrc: finding.closeupSrc, fullFrameSrc: null,
    fallbackReason: reason, alternate: false,
    rationale: 'The original evidence anchor for this finding.',
  };
}

/** Frozen cross-language fingerprint: sorted uint32 LE frame + 4 float64 LE coordinates. */
export async function presenterTrackSha256(track: Finding['track']): Promise<string> {
  const sorted = [...track].sort((a, b) => a.frame - b.frame);
  const bytes = new ArrayBuffer(sorted.length * 36);
  const view = new DataView(bytes);
  sorted.forEach(({ frame, box }, index) => {
    view.setUint32(index * 36, frame, true);
    box.forEach((coordinate, axis) => view.setFloat64(index * 36 + 4 + axis * 8, coordinate, true));
  });
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function entryIssue(survey: Survey, finding: Finding, entry: PresenterFrameMetadata, frameCount: number): string | null {
  const canonicalFrame = Math.floor(finding.evidenceTime * survey.media.fps + 1e-6);
  if (entry.canonicalFrame !== canonicalFrame) return 'The canonical evidence anchor changed.';
  if (entry.frame >= frameCount || Math.abs(entry.seconds - entry.frame / survey.media.fps) > 1e-6) return 'The source frame time is invalid.';
  if ((entry.decision === 'retain') !== (entry.frame === canonicalFrame)) return 'The source-frame decision does not match its anchor.';
  const sorted = [...finding.track].sort((a, b) => a.frame - b.frame);
  if (entry.trackSpan[0] !== sorted[0]?.frame || entry.trackSpan[1] !== sorted.at(-1)?.frame) return 'The retained track span changed.';
  const retained = sorted.find((item) => item.frame === entry.frame);
  if (!retained || retained.box.some((coordinate, index) => Math.abs(coordinate - entry.normalizedBox[index]) > 1e-12)) {
    return 'The source frame does not match this finding’s retained box.';
  }
  const { width, height } = survey.media;
  const crop = entry.cropRectPixels;
  if (crop.x + crop.width > width || crop.y + crop.height > height) return 'The source crop is outside the video.';
  const [x, y, w, h] = entry.normalizedBox;
  // Permit only the one-pixel rounding involved in extracting an integer crop.
  if (crop.x > x * width + 1 || crop.y > y * height + 1
    || crop.x + crop.width < (x + w) * width - 1 || crop.y + crop.height < (y + h) * height - 1) {
    return 'The source crop does not contain the retained finding.';
  }
  const prefix = `/curb/surveys/${survey.id}/presenter-v1/${finding.id}`;
  if (entry.cropSrc !== `${prefix}-crop.jpg` || entry.fullFrameSrc !== `${prefix}-frame.jpg`) return 'The source assets do not match this finding.';
  return null;
}

/** Match only media/track identity, never mutable review, description or revision.
 * The normalized-video and image hashes are provenance: the runtime survey does
 * not expose those bytes/hashes. Their byte verification belongs to the asset
 * audit; this adapter checks available identity and the relevant retained track.
 */
export async function resolvePresenterFrames(survey: Survey, metadata: unknown): Promise<Record<string, PresenterFrame>> {
  const fallback = (reason: string) => Object.fromEntries(survey.findings.map((finding) => [finding.id, canonicalPresenterFrame(survey, finding, reason)]));
  const parsed = MetadataSchema.safeParse(metadata);
  if (!parsed.success) return fallback('Presenter metadata unavailable or invalid; showing canonical evidence.');
  const source = parsed.data;
  const { media } = survey;
  if (source.surveyId !== survey.id
    || source.media.src !== media.src || source.media.sourceSrc !== media.sourceSrc
    || source.media.originalSha256 !== media.originalSha256
    || source.media.width !== media.width || source.media.height !== media.height || source.media.fps !== media.fps
    || source.media.frameCount !== Math.round(media.durationSeconds * media.fps)) {
    return fallback('Presenter media does not match this survey; showing canonical evidence.');
  }
  return Object.fromEntries(await Promise.all(survey.findings.map(async (finding) => {
    const matches = source.frames.filter((value) => typeof value === 'object' && value !== null
      && 'findingId' in value && value.findingId === finding.id);
    if (matches.length !== 1) return [finding.id, canonicalPresenterFrame(survey, finding, 'Presenter entry missing or duplicated; showing canonical evidence.')];
    const parsedEntry = FrameSchema.safeParse(matches[0]);
    if (!parsedEntry.success) return [finding.id, canonicalPresenterFrame(survey, finding, 'Presenter entry invalid; showing canonical evidence.')];
    const entry = parsedEntry.data;
    const issue = entryIssue(survey, finding, entry, source.media.frameCount);
    if (issue) return [finding.id, canonicalPresenterFrame(survey, finding, `${issue} Showing canonical evidence.`)];
    try {
      if (await presenterTrackSha256(finding.track) !== entry.trackSha256) {
        return [finding.id, canonicalPresenterFrame(survey, finding, 'Presenter track does not match this finding; showing canonical evidence.')];
      }
    } catch {
      return [finding.id, canonicalPresenterFrame(survey, finding, 'Presenter track could not be verified; showing canonical evidence.')];
    }
    return [finding.id, {
      findingId: finding.id, frame: entry.frame, seconds: entry.seconds,
      cropSrc: entry.cropSrc, fullFrameSrc: entry.fullFrameSrc,
      fallbackReason: null, alternate: entry.frame !== entry.canonicalFrame, rationale: entry.rationale,
    } satisfies PresenterFrame];
  })));
}
