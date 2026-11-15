import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import releasedMetadata from '../../../data/curb/surveys/robertson-presenter-frames.json';
import { describe, expect, it, vi } from 'vitest';
import { SurveySchema, type Survey } from '../../../contracts/curb/survey';
import sourceSurvey from '../../../data/curb/surveys/robertson-hall.json';
import {
  canonicalPresenterFrame, presenterTrackSha256, resolvePresenterFrames,
  type PresenterMetadata,
} from './presenter';

const survey = SurveySchema.parse(sourceSurvey);
const hero = survey.findings.find((finding) => finding.id === 'defect-04')!;

// Test-only metadata exercises the adapter; it is not released frame selection
// or an asset-audit receipt. Node Buffer is independent of the browser encoder.
function trackHash(track: Survey['findings'][number]['track']): string {
  const bytes = Buffer.alloc(track.length * 36);
  [...track].sort((a, b) => a.frame - b.frame).forEach(({ frame, box }, index) => {
    bytes.writeUInt32LE(frame, index * 36);
    box.forEach((coordinate, axis) => bytes.writeDoubleLE(coordinate, index * 36 + 4 + axis * 8));
  });
  return createHash('sha256').update(bytes).digest('hex');
}

function metadata(): PresenterMetadata {
  return {
    schemaVersion: 1, surveyId: survey.id,
    media: {
      src: survey.media.src, sourceSrc: survey.media.sourceSrc, originalSha256: survey.media.originalSha256,
      normalizedSha256: '52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6',
      width: survey.media.width, height: survey.media.height, fps: survey.media.fps, frameCount: 419,
    },
    trackFingerprintAlgorithm: 'sha256-u32le-f64le-v1', trackDataSha256: 'b'.repeat(64),
    frames: survey.findings.map((finding) => {
      const frame = Math.floor(finding.evidenceTime * survey.media.fps + 1e-6);
      return {
        findingId: finding.id, canonicalFrame: frame, frame, seconds: frame / survey.media.fps, decision: 'retain',
        trackSpan: [finding.track[0].frame, finding.track.at(-1)!.frame], trackSha256: trackHash(finding.track),
        normalizedBox: finding.track.find((entry) => entry.frame === frame)!.box,
        cropRectPixels: { x: 0, y: 0, width: survey.media.width, height: survey.media.height },
        fullFrameSrc: `/curb/surveys/${survey.id}/presenter-v1/${finding.id}-frame.jpg`,
        cropSrc: `/curb/surveys/${survey.id}/presenter-v1/${finding.id}-crop.jpg`,
        fullFrameSha256: 'c'.repeat(64), cropSha256: 'd'.repeat(64), rationale: 'Test-only retained anchor.',
      };
    }),
  };
}

describe('presenter evidence identity', () => {
  it('matches the independent little-endian binary golden and sorts without mutating', async () => {
    const track: Survey['findings'][number]['track'] = [
      { frame: 7, box: [0.125, 0.25, 0.5, 0.375] }, { frame: 3, box: [0, 0.125, 0.25, 0.5] },
    ];
    expect(await presenterTrackSha256(track)).toBe('77a9ffc4b8cdc4dd960e8f134345f657de04b114aabb4bebd860984aed6a558b');
    expect(track.map((entry) => entry.frame)).toEqual([7, 3]);
  });

  it('uses actual canonical evidence when no metadata is available, including final frame 418', async () => {
    const frames = await resolvePresenterFrames(survey, undefined);
    expect(frames['defect-04']).toMatchObject({ frame: 180, seconds: 6, cropSrc: hero.closeupSrc, alternate: false, fullFrameSrc: null });
    expect(frames['defect-04'].fallbackReason).toMatch(/canonical evidence/);
    expect(frames['defect-05']).toMatchObject({ frame: 418, seconds: 418 / 30 });
    expect(canonicalPresenterFrame(survey, hero).fallbackReason).toMatch(/canonical/);
  });

  it('accepts all five compatible retained anchors without changing the survey', async () => {
    const before = JSON.stringify(survey);
    const frames = await resolvePresenterFrames(survey, metadata());
    expect(Object.keys(frames)).toEqual(survey.findings.map((finding) => finding.id));
    for (const frame of Object.values(frames)) {
      expect(frame.fallbackReason).toBeNull();
      expect(frame.alternate).toBe(false);
    }
    expect(frames['defect-05'].frame).toBe(418);
    expect(JSON.stringify(survey)).toBe(before);
  });

  it('uses a different retained source frame only for presentation, with its matching box', async () => {
    const source = metadata();
    const entry = source.frames.find((frame) => frame.findingId === hero.id)!;
    const other = hero.track.find((item) => item.frame !== entry.frame)!;
    entry.frame = other.frame;
    entry.seconds = other.frame / survey.media.fps;
    entry.normalizedBox = other.box;
    entry.decision = 'change';
    const frames = await resolvePresenterFrames(survey, source);
    expect(frames[hero.id]).toMatchObject({ frame: other.frame, seconds: other.frame / 30, alternate: true, fallbackReason: null });
    expect(hero.evidenceTime).toBe(6);
  });

  it('keeps frame compatibility after review, text, measurement and revision edits', async () => {
    const changed = structuredClone(survey);
    changed.revision += 1;
    const finding = changed.findings.find((item) => item.id === hero.id)!;
    finding.review = { status: 'accepted', method: 'manual', reviewer: 'Actual reviewer', note: 'Test review edit.' };
    finding.description = 'Edited observation';
    finding.label = 'Edited label';
    finding.measurements = [];
    const frames = await resolvePresenterFrames(changed, metadata());
    expect(frames[hero.id].fallbackReason).toBeNull();
  });

  it.each(['src', 'sourceSrc', 'originalSha256', 'width', 'height', 'fps', 'frameCount'] as const)('falls back for a different media %s', async (field) => {
    const source = metadata();
    if (typeof source.media[field] === 'string') (source.media as Record<string, unknown>)[field] = field === 'originalSha256' ? 'e'.repeat(64) : '/different/source';
    else (source.media as Record<string, unknown>)[field] = Number(source.media[field]) + 1;
    const frames = await resolvePresenterFrames(survey, source);
    expect(Object.values(frames).every((frame) => frame.fallbackReason?.includes('media does not match'))).toBe(true);
  });

  it.each([
    ['survey identity', (source: PresenterMetadata) => { source.surveyId = 'different-survey'; }],
    ['fingerprint algorithm', (source: PresenterMetadata) => { (source as { trackFingerprintAlgorithm: string }).trackFingerprintAlgorithm = 'sha256-json'; }],
    ['normalized provenance hash', (source: PresenterMetadata) => { source.media.normalizedSha256 = 'not-a-hash'; }],
    ['track-file provenance hash', (source: PresenterMetadata) => { source.trackDataSha256 = 'not-a-hash'; }],
  ] as const)('rejects invalid root %s', async (_label, mutate) => {
    const source = metadata(); mutate(source);
    const frames = await resolvePresenterFrames(survey, source);
    expect(Object.values(frames).every((frame) => frame.fallbackReason !== null)).toBe(true);
  });

  it('falls back only the missing entry, with no neighboring crop substitution', async () => {
    const source = metadata();
    source.frames = source.frames.filter((frame) => frame.findingId !== hero.id);
    const frames = await resolvePresenterFrames(survey, source);
    expect(frames[hero.id].cropSrc).toBe(hero.closeupSrc);
    expect(frames[hero.id].fallbackReason).toMatch(/missing/);
    expect(frames['defect-01'].fallbackReason).toBeNull();
  });

  it('rejects duplicate entries even if the first is compatible', async () => {
    const source = metadata();
    source.frames.push(structuredClone(source.frames[3]));
    expect((await resolvePresenterFrames(survey, source))[hero.id].fallbackReason).toMatch(/duplicated/);
  });

  it.each([
    ['canonical frame', (entry: PresenterMetadata['frames'][number]) => { entry.canonicalFrame += 1; }],
    ['frame outside clip', (entry: PresenterMetadata['frames'][number]) => { entry.frame = 419; entry.seconds = 419 / 30; entry.decision = 'change'; }],
    ['frame time', (entry: PresenterMetadata['frames'][number]) => { entry.seconds += 0.5; }],
    ['retain decision', (entry: PresenterMetadata['frames'][number]) => { entry.decision = 'change'; }],
    ['track span', (entry: PresenterMetadata['frames'][number]) => { entry.trackSpan[1] -= 1; }],
    ['selected box', (entry: PresenterMetadata['frames'][number]) => { entry.normalizedBox = [0, 0, 0.1, 0.1]; }],
    ['track fingerprint', (entry: PresenterMetadata['frames'][number]) => { entry.trackSha256 = 'e'.repeat(64); }],
    ['crop bounds', (entry: PresenterMetadata['frames'][number]) => { entry.cropRectPixels.x = 1; }],
    ['crop excludes finding', (entry: PresenterMetadata['frames'][number]) => { entry.cropRectPixels = { x: 0, y: 0, width: 1, height: 1 }; }],
    ['other finding crop', (entry: PresenterMetadata['frames'][number]) => { entry.cropSrc = entry.cropSrc.replace('defect-04', 'defect-03'); }],
    ['other finding frame', (entry: PresenterMetadata['frames'][number]) => { entry.fullFrameSrc = entry.fullFrameSrc.replace('defect-04', 'defect-03'); }],
    ['external crop', (entry: PresenterMetadata['frames'][number]) => { entry.cropSrc = 'https://example.com/crop.jpg'; }],
    ['image provenance hash', (entry: PresenterMetadata['frames'][number]) => { entry.cropSha256 = 'bad-hash'; }],
  ] as const)('falls back for mismatched entry %s', async (_label, mutate) => {
    const source = metadata(); mutate(source.frames[3]);
    const frames = await resolvePresenterFrames(survey, source);
    expect(frames[hero.id].cropSrc).toBe(hero.closeupSrc);
    expect(frames[hero.id].fallbackReason).not.toBeNull();
    expect(frames['defect-01'].fallbackReason).toBeNull();
  });

  it('detects a changed nonselected track sample even when the selected box still matches', async () => {
    const changed = structuredClone(survey);
    const finding = changed.findings.find((item) => item.id === hero.id)!;
    finding.track[0].box[0] += 0.00001;
    expect((await resolvePresenterFrames(changed, metadata()))[hero.id].fallbackReason).toMatch(/track does not match/);
  });

  it('fails visibly to canonical evidence when browser cryptography is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);
    try {
      expect((await resolvePresenterFrames(survey, metadata()))[hero.id].fallbackReason).toMatch(/could not be verified/);
    } finally { vi.unstubAllGlobals(); }
  });
});


describe('released presenter frame checkpoint', () => {
  it('matches all five audited source choices against the combined runtime survey', async () => {
    const before = JSON.stringify(survey);
    const frames = await resolvePresenterFrames(survey, releasedMetadata);
    expect(Object.values(frames).map((frame) => frame.frame)).toEqual([195, 264, 326, 180, 398]);
    expect(Object.values(frames).every((frame) => frame.fallbackReason === null)).toBe(true);
    expect(frames['defect-02']).toMatchObject({ seconds: 8.8, alternate: true });
    expect(frames['defect-04']).toMatchObject({ seconds: 6, alternate: false });
    expect(JSON.stringify(survey)).toBe(before);
  });

  it('binds the ten committed JPEG assets to the released metadata hashes', () => {
    for (const frame of releasedMetadata.frames) {
      for (const [src, expected] of [[frame.fullFrameSrc, frame.fullFrameSha256], [frame.cropSrc, frame.cropSha256]]) {
        const bytes = readFileSync(resolve(process.cwd(), 'public', src.slice(1)));
        expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected);
      }
    }
  });
});
