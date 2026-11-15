/**
 * CLIP image check for the Robertson Hall survey close-ups.
 *
 * Runs OpenAI CLIP (ViT-B/32, ONNX build via transformers.js) zero-shot on each
 * finding's close-up and records how strongly it matches a set of plain
 * sidewalk-condition labels. The result is a confirmation signal shown beside
 * the findings; it does not add, remove or re-rank findings.
 *
 * Usage: node --import tsx scripts/curb/clip_check.ts
 * Writes: src/data/curb/surveys/robertson-clip.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline, RawImage } from '@huggingface/transformers';

const MODEL = 'Xenova/clip-vit-base-patch32';
const LABELS = [
  'a cracked concrete sidewalk',
  'a broken, crumbling concrete sidewalk',
  'a smooth, undamaged concrete sidewalk',
  'grass',
  'an asphalt road',
];
const CRACK_LABELS = new Set(LABELS.slice(0, 2));
/** Travel impact: how hard the surface looks to walk or roll over. */
const IMPACT_LABELS = [
  'a badly damaged sidewalk that is hard to walk or roll over',
  'a sidewalk with a minor crack that is easy to walk over',
];
const HIGH_IMPACT_AT = 0.5;

const root = process.cwd();
const survey = JSON.parse(await readFile(join(root, 'src/data/curb/surveys/robertson-hall.json'), 'utf8')) as {
  findings: { id: string; closeupSrc: string }[];
};

const classify = await pipeline('zero-shot-image-classification', MODEL);
const findings = [];
for (const finding of survey.findings) {
  const image = await RawImage.read(join(root, 'public', finding.closeupSrc));
  const scores = (await classify(image, LABELS)) as { label: string; score: number }[];
  const top = scores[0];
  const damage = scores.filter((s) => CRACK_LABELS.has(s.label)).reduce((sum, s) => sum + s.score, 0);
  const impactScores = (await classify(image, IMPACT_LABELS)) as { label: string; score: number }[];
  const impact = impactScores.find((s) => s.label === IMPACT_LABELS[0])!.score;
  findings.push({
    id: finding.id,
    topLabel: top.label,
    damageScore: Number(damage.toFixed(4)),
    confirmsDamage: damage >= 0.5,
    impactScore: Number(impact.toFixed(4)),
    impactPriority: impact >= HIGH_IMPACT_AT ? 'high' : 'low',
    scores: scores.map((s) => ({ label: s.label, score: Number(s.score.toFixed(4)) })),
  });
  console.log(`${finding.id}: ${top.label} (${(top.score * 100).toFixed(1)}%), damage ${(damage * 100).toFixed(1)}%, travel impact ${(impact * 100).toFixed(1)}%`);
}

const out = {
  model: 'CLIP ViT-B/32 (openai/clip-vit-base-patch32, ONNX)',
  task: 'zero-shot image classification of finding close-ups',
  labels: LABELS,
  impactLabels: IMPACT_LABELS,
  createdAt: new Date().toISOString(),
  findings,
};
await writeFile(join(root, 'src/data/curb/surveys/robertson-clip.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote robertson-clip.json (${findings.length} close-ups).`);
