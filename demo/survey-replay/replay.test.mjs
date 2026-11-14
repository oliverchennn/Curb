import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compareRoutes, evaluateRoutes, validateSurvey } from '../../public/survey-replay/graph.mjs';

const fixture = JSON.parse(readFileSync(new URL('../../public/survey-replay/survey.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(fixture);

test('the unchanged sample preserves all three named trip outcomes', () => {
  const survey = validateSurvey(fresh());
  const rows = repair => compareRoutes(survey, repair).destinations.map(({ label, route, saved, restored }) =>
    [label, route?.distance ?? null, saved, restored]);
  assert.deepEqual(rows('current'), [['Library', 330, 0, false], ['Clinic', null, 0, false], ['Pharmacy', null, 0, false]]);
  assert.deepEqual(rows('surface-crack'), [['Library', 240, 90, false], ['Clinic', null, 0, false], ['Pharmacy', null, 0, false]]);
  assert.deepEqual(rows('raised-slab'), [['Library', 330, 0, false], ['Clinic', 260, 0, true], ['Pharmacy', 275, 0, true]]);
  assert.equal(compareRoutes(survey, 'surface-crack').distanceSaved, 90);
  assert.deepEqual(survey, fixture);
});

for (const reviewed of ['true', 'false', 1]) {
  test('rejects nonboolean assessment.reviewed ' + JSON.stringify(reviewed), () => {
    const survey = fresh();
    survey.findings[1].assessment.reviewed = reviewed;
    assert.throws(() => validateSurvey(survey), /boolean/);
  });
}

test('rejects malformed direction and preserves the two-way omission default', () => {
  const survey = fresh();
  survey.findings = [];
  survey.origin = 'clinic';
  survey.destinations = [{ node: 'east', label: 'East' }];
  survey.segments = [{ id: 'one', from: 'east', to: 'clinic', meters: 10, bidirectional: 'false' }];
  assert.throws(() => validateSurvey(survey), /boolean direction/);
  survey.segments[0].bidirectional = false;
  assert.equal(evaluateRoutes(validateSurvey(survey)).destinations[0].route, null);
  delete survey.segments[0].bidirectional;
  assert.equal(evaluateRoutes(validateSurvey(survey)).destinations[0].route.distance, 10);
});

test('rejects a finding named after the untreated baseline', () => {
  const survey = fresh();
  survey.findings.push({ ...survey.findings[1], id: 'current', segment: 'bus-west' });
  assert.throws(() => validateSurvey(survey), /invalid ID/);
});

test('rejects overflow in segment and combined destination totals', () => {
  const survey = fresh();
  for (const segment of survey.segments) segment.meters = 1e308;
  assert.throws(() => validateSurvey(survey), /supported total/);

  const shared = fresh();
  shared.segments = [
    { id: 'short', from: 'bus', to: 'west', meters: 1 },
    { id: 'long', from: 'bus', to: 'west', meters: 1e308 },
    { id: 'last', from: 'west', to: 'library', meters: 1 },
  ];
  shared.findings = [{ ...shared.findings[0], segment: 'short' }];
  shared.destinations = [{ node: 'west', label: 'West' }, { node: 'library', label: 'Library' }];
  assert.throws(() => compareRoutes(validateSurvey(shared), 'surface-crack'), /distance saved/);
});

test('only a separate reviewed blocking assessment affects the synthetic model', () => {
  const survey = fresh();
  const slab = survey.findings[1];
  survey.findings.push({ ...slab, id: 'second-block' });
  assert.equal(compareRoutes(validateSurvey(survey), 'raised-slab').destinations[1].route, null);
  survey.findings[2].assessment = { ...slab.assessment, reviewed: false };
  assert.equal(compareRoutes(validateSurvey(survey), 'raised-slab').destinations[1].route.distance, 260);
  delete slab.assessment;
  assert.equal(compareRoutes(validateSurvey(survey), 'current').destinations[1].route.distance, 260);
});

test('replacement geography remains valid for annotation review with no comparison', () => {
  const survey = fresh();
  survey.sample = false;
  assert.equal(validateSurvey(survey), survey);
  assert.equal(evaluateRoutes(survey), null);
  assert.equal(compareRoutes(survey, 'raised-slab'), null);
});

test('validates every kind of display and interaction input before rendering', () => {
  const invalid = [
    survey => { survey.sample = 'true'; },
    survey => { survey.label = []; },
    survey => { survey.video.label = null; },
    survey => { survey.nodes[0].x = 651; },
    survey => { survey.nodes[0].label = 3; },
    survey => { survey.segments[0] = null; },
    survey => { survey.destinations[0].label = false; },
    survey => { survey.findings[1].label = 42; },
    survey => { survey.findings[1].location = {}; },
    survey => { survey.findings[1].start = '11'; },
    survey => { survey.findings[1].box[2] = 1; },
    survey => { survey.findings[1].source = []; },
    survey => { survey.findings[1].segment = 'missing'; },
    survey => { survey.findings[1].assessment = null; },
    survey => { survey.findings[1].assessment.reason = []; },
    survey => { survey.findings[1].measurement = { value: 1, unit: 'm' }; },
  ];
  for (const edit of invalid) {
    const survey = fresh();
    edit(survey);
    assert.throws(() => validateSurvey(survey), Error);
  }
  const literal = fresh();
  literal.findings[1].label = '<img src=x onerror=alert(1)>';
  assert.equal(validateSurvey(literal).findings[1].label, '<img src=x onerror=alert(1)>');
});

test('video, poster and close-up accept only replay-local media paths of the expected type', () => {
  for (const path of ['https://example.test/remote', '//example.test/media/remote', '/media/file', 'data:text/html,x',
    'javascript:alert(1)', '../media/file', 'media/../file', 'media/%2e%2e/file', 'media\\file', 'media/file?query',
    'media/file#fragment', 'media//file']) {
    const video = fresh();
    video.video.src = path + '.mp4';
    assert.throws(() => validateSurvey(video), /local video/);
    const poster = fresh();
    poster.video.poster = path + '.jpg';
    assert.throws(() => validateSurvey(poster), /local video/);
    const closeUp = fresh();
    closeUp.findings[1].closeUp = path + '.jpg';
    assert.throws(() => validateSurvey(closeUp), /local close-up/);
  }
  const survey = fresh();
  survey.video.src = 'media/edited/clip.webm';
  survey.video.poster = 'media/edited/PREVIEW.PNG';
  survey.findings[1].closeUp = 'media/edited/detail.jpeg';
  assert.equal(validateSurvey(survey), survey);
});
