import { conditions, validateSurvey, compareRoutes, isReviewedBlock } from './graph.mjs';

const $ = id => document.getElementById(id);
const video = $('video');
const seek = $('seek');
const artwork = $('street-map');
const annotations = $('annotations');
const mediaState = $('media-state');
const play = $('play');
const bigPlay = $('video-action');
const icon = paths => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + paths + '</svg>';
const playIcon = icon('<path d="m8 5 12 7-12 7z" fill="currentColor"/>');
const pauseIcon = icon('<path d="M9 6v12m6-12v12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>');
const SVG = 'http://www.w3.org/2000/svg';
const width = 650;
const height = 392;
let survey;
let selected = null;
let repair = 'current';
let result;
const results = new Map();
let frame = 0;
let marked = '';
let ready = false;
let nodeById;
let edgeById;
const findingRows = new Map();
const pins = new Map();
const colors = ['#985d18', '#b3432a', '#3e6488'];

function element(tag, className, label) {
  const node = document.createElement(tag);
  node.className = className;
  if (label !== undefined) node.textContent = label;
  return node;
}

function svg(parent, tag, attributes, value) {
  const item = document.createElementNS(SVG, tag);
  for (const [name, attr] of Object.entries(attributes)) item.setAttribute(name, attr);
  if (value !== undefined) item.textContent = value;
  parent.append(item);
  return item;
}

function timecode(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function color(finding) {
  return finding.id === 'raised-slab' ? colors[1] : (finding.id === 'surface-crack' ? colors[0] : colors[2]);
}

function setStep(step) {
  for (const name of ['review', 'compare']) {
    const button = $('step-' + name);
    if (name === step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
}

function makeMapBackground() {
  const background = svg(artwork, 'g', { 'aria-hidden': 'true' });
  svg(background, 'rect', { width, height, fill: '#edf0e5' });
  if (!survey.sample) return addMapLayers();
  for (const [x, y, w, h] of [[21, 22, 118, 165], [191, 25, 104, 55], [351, 21, 117, 54],
    [526, 20, 105, 102], [347, 119, 124, 93], [525, 194, 106, 36],
    [22, 274, 115, 92], [190, 279, 103, 91], [347, 277, 126, 92], [535, 276, 95, 88]]) {
    svg(background, 'rect', { x, y, width: w, height: h, rx: 9, fill: '#e2e7d9', stroke: '#d8dfd0' });
  }
  const park = svg(background, 'rect', { x: 197, y: 118, width: 104, height: 101, rx: 9, fill: '#d5e1cc' });
  park.setAttribute('stroke', '#c8d8bf');
  for (const [x, y, w, h] of [[34, 37, 68, 31], [44, 91, 75, 39], [41, 146, 58, 27],
    [209, 37, 38, 20], [259, 39, 21, 30], [365, 34, 52, 25], [428, 36, 26, 30],
    [542, 34, 72, 26], [546, 75, 55, 31], [369, 137, 38, 52], [420, 146, 32, 42],
    [43, 289, 70, 24], [36, 325, 66, 28], [205, 293, 35, 52], [254, 289, 26, 62],
    [364, 292, 43, 54], [422, 295, 29, 51], [556, 285, 54, 31], [549, 330, 53, 20]]) {
    svg(background, 'rect', { x, y, width: w, height: h, rx: 3, fill: '#cbd4c7', stroke: '#c5cfc0' });
  }
  for (const [x, y] of [[216, 137], [233, 151], [280, 131], [221, 190], [251, 197], [273, 185], [282, 206], [185, 375], [481, 353]]) {
    svg(background, 'circle', { cx: x, cy: y, r: 7, fill: '#bbcfb4', stroke: '#afc4a7' });
  }
  for (const path of ['M0 245H650', 'M15 95H650', 'M173 0V392', 'M321 0V392', 'M507 0V392', 'M0 380H650']) {
    svg(background, 'path', { d: path, stroke: '#d8ddcf', 'stroke-width': 21 });
    svg(background, 'path', { d: path, stroke: '#fafaf2', 'stroke-width': 18 });
  }
  for (const [x, y, label, angle] of [[245, 173, 'MAPLE PARK', 0], [223, 265, 'MARKET ST', 0],
    [384, 82, 'PARK LN', 0], [337, 185, 'MAPLE AVE', -90], [321, 375, 'ELM ST', 0]]) {
    svg(background, 'text', { x, y, fill: '#657166', 'font-size': 10, 'font-weight': 700,
      'letter-spacing': 1.15, 'text-anchor': 'middle', transform: 'rotate(' + angle + ' ' + x + ' ' + y + ')' }, label);
  }
  svg(background, 'path', { d: 'M620 37l6-16 6 16-6-3z', fill: '#617162' });
  svg(background, 'text', { x: 626, y: 16, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: '#4a5e50' }, 'N');
  addMapLayers();
}

function addMapLayers() {
  for (const id of ['segments', 'routes', 'selection', 'places']) svg(artwork, 'g', { id });
}

function edgeLine(group, edge, attributes) {
  const start = nodeById.get(edge.from);
  const end = nodeById.get(edge.to);
  return svg(group, 'line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y,
    'stroke-linecap': 'round', ...attributes });
}

function place(group, node, label, status, iconType) {
  const point = svg(group, 'g', { transform: 'translate(' + node.x + ' ' + node.y + ')' });
  const theme = status === 'blocked' ? '#895044' : (status === 'restored' ? '#14715a' : status === 'neutral' ? '#5f665c' : '#3b5b46');
  const background = status === 'blocked' ? '#fff4ec' : '#fafff4';
  svg(point, 'circle', { r: 13, fill: background, stroke: theme, 'stroke-width': 2.2 });
  const glyphs = {
    bus: 'M-6 4V-4Q-6-7 0-7T6-4V4ZM-6 0H6M-4 4V6M4 4V6',
    library: 'M-7-2L0-7l7 5ZM-6 6H6M-4-1v5m4-5v5m4-5v5',
    clinic: 'M-2-7h4v5h5v4H2v5h-4V2h-5v-4h5Z',
    pharmacy: 'M0-6v12M-4-2l4-4 4 4M-6 6H6',
  };
  svg(point, 'path', { d: Object.hasOwn(glyphs, iconType) ? glyphs[iconType] : 'M-5 0H5', fill: 'none', stroke: theme, 'stroke-width': 1.4, 'stroke-linejoin': 'round' });
  const isBus = iconType === 'bus';
  const x = isBus ? 0 : 19;
  const y = isBus ? 37 : 5;
  svg(point, 'text', { x, y, 'text-anchor': isBus ? 'middle' : 'start', fill: theme, stroke: '#f8faf1',
    'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round',
    'font-size': 16, 'font-weight': 750 }, label);
}

function drawMap(animate = false) {
  for (const id of ['segments', 'routes', 'places']) $(id).replaceChildren();
  const used = new Set(result?.destinations.flatMap(({ route }) => route?.edges ?? []) ?? []);
  for (const edge of survey.segments) {
    const blocked = result?.blocked.has(edge.id) ?? false;
    const finding = blocked && survey.findings.find(item =>
      item.segment === edge.id && item.id !== repair && isReviewedBlock(item.assessment));
    edgeLine($('segments'), edge, { 'data-segment': edge.id, 'data-blocked': String(blocked),
      stroke: blocked ? color(finding) : '#94a28e', 'stroke-width': blocked ? 4 : 2.6,
      ...(blocked ? { 'stroke-dasharray': '7 7' } : {}) });
    if (used.has(edge.id)) {
      const changed = !result.currentEdges.has(edge.id);
      edgeLine($('routes'), edge, { stroke: changed ? '#178168' : '#526c51', 'stroke-width': changed ? 5.1 : 4,
        pathLength: 1, ...(changed && animate ? { class: 'route-new' } : {}) });
    }
  }
  place($('places'), nodeById.get(survey.origin), nodeById.get(survey.origin).label ?? 'Start', 'neutral', 'bus');
  for (const { node, label } of survey.destinations) {
    const comparison = result?.destinations.find(item => item.node === node);
    const status = comparison ? (!comparison.route ? 'blocked' : comparison.restored ? 'restored' : 'reachable') : 'neutral';
    place($('places'), nodeById.get(node), label, status, node);
  }
  drawSelection();
}

function drawSelection() {
  const layer = $('selection');
  layer.replaceChildren();
  const finding = survey.findings.find(item => item.id === selected);
  if (!finding) return;
  const edge = edgeById.get(finding.segment);
  edgeLine(layer, edge, { 'data-selected-segment': edge.id, stroke: color(finding), 'stroke-width': 11, opacity: .36 });
}

function renderResults() {
  const restored = result.destinations.filter(item => item.restored);

  const metrics = element('div', 'metrics');
  for (const [value, label] of [[restored.length ? '+' + restored.length : '0', 'Newly reachable destinations'],
    [result.distanceSaved + ' m', 'Distance saved on existing routes']]) {
    const block = element('div', 'metric');
    block.append(element('strong', '', value), element('span', '', label));
    metrics.append(block);
  }
  const destinations = element('ul', 'destination-list');
  for (const { label, node, route, restored, saved } of result.destinations) {
    const item = element('li', '');
    item.dataset.destination = node;
    item.append(element('strong', '', label), element('span', !route ? 'blocked' : (restored || saved ? 'restored' : ''),
      !route ? 'Blocked' : route.distance + ' m' + (restored ? ' · new' : '')));
    destinations.append(item);
  }
  $('map-results').replaceChildren(metrics, destinations);
}

function setRepair(id) {
  repair = id;
  result = results.get(id);
  for (const button of $('repair-controls').children) {
    button.setAttribute('aria-pressed', String(button.dataset.repair === id));
  }
  setStep('compare');
  drawMap(id !== 'current');
  renderResults();
}

function updateFindingDetail() {
  const detail = $('finding-detail');
  const finding = survey.findings.find(item => item.id === selected);
  detail.replaceChildren();
  detail.hidden = !finding;
  for (const [id, node] of [...findingRows, ...pins]) node.setAttribute('aria-pressed', String(id === selected));
  if (!finding) return;
  if (finding.closeUp) {
    const button = element('button', 'photo-button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Open ' + finding.label.toLowerCase() + ' close-up');
    const photo = element('img', '');
    photo.alt = '';
    photo.src = finding.closeUp;
    button.append(photo);
    button.addEventListener('click', () => {
      $('detail-photo').src = finding.closeUp;
      $('detail-photo').alt = finding.label + ' close-up';
      $('photo-caption').textContent = finding.label + ' · ' + finding.location;
      $('photo-dialog').showModal();
    });
    detail.append(button);
  }
  const text = element('div', '');
  const assessment = finding.assessment;
  const source = finding.source === 'model' ? 'Model annotation' : 'Manual annotation';
  const review = assessment?.reviewed === true
    ? 'Reviewed · ' + (isReviewedBlock(assessment) ? 'Step-free block' : 'Step-free passable')
    : 'Review pending · Passability unknown';
  const measurement = finding.measurement ? ' · ' + finding.measurement.value + ' ' + finding.measurement.unit + ' measured rise' : '';
  text.append(element('strong', '', finding.label + ' · ' + finding.location),
    element('p', '', source + ' · ' + review + measurement));
  if (assessment?.reviewed === true && assessment.reason) text.append(element('p', '', assessment.reason));
  detail.append(text);
}

function selectFinding(finding) {
  if (!ready || finding.start >= video.duration) return;
  selected = finding.id;
  video.pause();
  video.currentTime = finding.start + Math.min(.08, (Math.min(finding.end, video.duration) - finding.start) / 2);
  setStep('review');
  updateFindingDetail();
  drawSelection();
  syncVideo(true);
}

function addFinding(finding) {
  const button = element('button', 'finding-button');
  button.type = 'button';
  button.dataset.finding = finding.id;
  button.style.setProperty('--finding-color', color(finding));
  const label = element('span', '');
  label.append(element('i', 'finding-dot'), element('b', '', finding.label));
  button.append(label, element('time', '', timecode(finding.start)));
  button.addEventListener('click', () => selectFinding(finding));
  const row = element('div', 'finding-row');
  const message = element('p', 'finding-unavailable', 'Start time is outside the loaded video.');
  message.id = 'finding-unavailable-' + finding.id;
  message.hidden = true;
  row.append(button, message);
  $('finding-list').append(row);
  findingRows.set(finding.id, button);

  const pin = element('button', 'map-pin');
  pin.type = 'button';
  pin.dataset.pin = finding.id;
  pin.setAttribute('aria-label', finding.label + ' evidence at ' + timecode(finding.start));
  pin.style.setProperty('--finding-color', color(finding));
  const segment = edgeById.get(finding.segment);
  const from = nodeById.get(segment.from);
  const to = nodeById.get(segment.to);
  const x = (from.x + to.x) / 2;
  const y = (from.y + to.y) / 2;
  pin.style.left = (x / width * 100) + '%';
  pin.style.top = ((y - 15) / height * 100) + '%';
  pin.hidden = true;
  pin.append(element('i', 'finding-dot'), element('span', '', finding.label));
  pin.addEventListener('click', () => selectFinding(finding));
  $('map-pins').append(pin);
  pins.set(finding.id, pin);
}

function syncVideo(force = false) {
  const elapsed = video.currentTime;
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  seek.value = elapsed;
  $('time').textContent = timecode(elapsed) + ' / ' + timecode(duration);
  for (const finding of survey.findings) {
    pins.get(finding.id).hidden = !ready || elapsed < finding.start || finding.start >= duration;
  }
  const selectedFinding = survey.findings.find(item => item.id === selected);
  if (selectedFinding && elapsed < selectedFinding.start) {
    selected = null;
    updateFindingDetail();
    drawSelection();
  }
  const current = ready ? survey.findings.filter(({ start, end }) => elapsed >= start && elapsed < end) : [];
  const marker = current.map(({ id }) => id).join(',');
  if (marker === marked && !force) return;
  marked = marker;
  annotations.replaceChildren();
  if (!current.length || !video.videoWidth) return;

  const ratio = Math.min(video.clientWidth / video.videoWidth, video.clientHeight / video.videoHeight);
  const contentWidth = video.videoWidth * ratio;
  const contentHeight = video.videoHeight * ratio;
  const insetX = (video.clientWidth - contentWidth) / 2;
  const insetY = (video.clientHeight - contentHeight) / 2;
  for (const finding of current) {
    const [x, y, w, h] = finding.box;
    const box = element('div', 'box');
    box.dataset.annotation = finding.id;
    box.style.setProperty('--finding-color', color(finding));
    Object.assign(box.style, { left: (insetX + x * contentWidth) + 'px', top: (insetY + y * contentHeight) + 'px',
      width: w * contentWidth + 'px', height: h * contentHeight + 'px' });
    box.append(element('span', '', finding.label));
    annotations.append(box);
  }
}

function frameLoop() {
  syncVideo();
  if (!video.paused && !video.ended) frame = requestAnimationFrame(frameLoop);
}

function playbackState() {
  const playing = !video.paused && !video.ended;
  play.innerHTML = playing ? pauseIcon : playIcon;
  play.setAttribute('aria-label', playing ? 'Pause survey' : 'Play survey');
  bigPlay.hidden = !ready || playing || video.currentTime > .05;
  bigPlay.innerHTML = playIcon;
}

function toggleVideo() {
  if (video.paused) {
    if (video.ended) video.currentTime = 0;
    video.play().catch(() => showMediaMessage('Playback could not start. Press play to retry.'));
  } else {
    video.pause();
  }
}

function showMediaMessage(message) {
  mediaState.hidden = !message;
  mediaState.textContent = message;
}

function updateReadiness(isReady) {
  ready = isReady;
  seek.disabled = !ready;
  play.disabled = !ready;
  for (const finding of survey.findings) {
    const outsideVideo = ready && finding.start >= video.duration;
    const button = findingRows.get(finding.id);
    const message = $('finding-unavailable-' + finding.id);
    button.disabled = !ready || outsideVideo;
    message.hidden = !outsideVideo;
    if (outsideVideo) button.setAttribute('aria-describedby', message.id);
    else button.removeAttribute('aria-describedby');
    pins.get(finding.id).disabled = button.disabled;
  }
  if (ready) {
    seek.max = video.duration;
    $('video-duration').textContent = timecode(video.duration) + ' video';
    $('cue-marks').replaceChildren();
    for (const finding of survey.findings.filter(item => item.start < video.duration)) {
      const cue = element('i', 'cue');
      cue.style.left = (finding.start / video.duration * 100) + '%';
      cue.style.setProperty('--finding-color', color(finding));
      $('cue-marks').append(cue);
    }
  }
  playbackState();
  syncVideo(true);
}

function wireMedia() {
  video.addEventListener('waiting', () => { if (!video.paused) showMediaMessage('Buffering video…'); });
  video.addEventListener('loadeddata', () => {
    const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
    showMediaMessage(hasDuration ? '' : 'The local survey video has no usable duration.');
    updateReadiness(hasDuration);
  });
  video.addEventListener('playing', () => { showMediaMessage(''); playbackState(); cancelAnimationFrame(frame); frameLoop(); });
  for (const event of ['pause', 'ended', 'seeked', 'timeupdate']) {
    video.addEventListener(event, () => {
      if (event === 'pause' || event === 'ended') {
        cancelAnimationFrame(frame);
        if (ready) showMediaMessage('');
      }
      playbackState();
      syncVideo();
    });
  }
  video.addEventListener('error', () => {
    updateReadiness(false);
    showMediaMessage('The survey video could not load. Check the local media file.');
  });
  seek.addEventListener('input', () => {
    video.currentTime = Number(seek.value);
    selected = survey.findings.find(item => video.currentTime >= item.start && video.currentTime < item.end)?.id ?? null;
    updateFindingDetail();
    drawSelection();
    syncVideo(true);
  });
  for (const button of [play, bigPlay]) button.addEventListener('click', toggleVideo);
  new ResizeObserver(() => syncVideo(true)).observe($('video-surface'));
  showMediaMessage('Loading video…');
  if (survey.video.poster) video.poster = survey.video.poster;
  video.src = survey.video.src;
}

async function init() {
  try {
    const response = await fetch('./survey.json');
    if (!response.ok) throw new Error('Could not load survey.json.');
    survey = validateSurvey(await response.json());
    if (survey.sample) {
      for (const { id } of conditions) {
        if (id === 'current' || survey.findings.some(finding => finding.id === id)) {
          results.set(id, compareRoutes(survey, id));
        }
      }
    }
  } catch (error) {
    $('data-state').textContent = 'Survey unavailable. ' + error.message;
    return;
  }
  nodeById = new Map(survey.nodes.map(node => [node.id, node]));
  edgeById = new Map(survey.segments.map(edge => [edge.id, edge]));
  $('data-state').hidden = true;
  $('workspace').hidden = false;
  $('media-label').textContent = survey.video.label;
  $('map-label').textContent = survey.label + (survey.sample ? ' · Sample geography' : '');
  $('footnote').textContent = survey.sample
    ? 'Synthetic fixed-scenario demonstration. Repairs and distances are illustrative. Use surveyed evidence and separate assessment for real trips.'
    : 'Video, annotations, and mapped finding locations are available for review.';
  $('sample-profile').hidden = !survey.sample;
  $('map-legend').hidden = !survey.sample;
  $('comparison-assumptions').hidden = !survey.sample;
  $('repair-controls').hidden = !survey.sample;
  $('finding-count').textContent = String(survey.findings.length);
  makeMapBackground();
  for (const finding of survey.findings) addFinding(finding);
  for (const { id, label } of conditions.filter(({ id }) => results.has(id))) {
    const button = element('button', '', label);
    button.type = 'button';
    button.dataset.repair = id;
    button.setAttribute('aria-pressed', String(id === repair));
    button.addEventListener('click', () => setRepair(id));
    $('repair-controls').append(button);
  }
  $('step-review').addEventListener('click', () => { setStep('review'); play.focus(); });
  $('step-compare').addEventListener('click', () => {
    setStep('compare');
    ($('repair-controls').querySelector('[aria-pressed=true]') ?? $('map-results')).focus();
  });
  result = results.get(repair);
  drawMap();
  if (result) renderResults();
  else $('map-results').textContent = 'Comparison unavailable for replacement geography. Continue reviewing video and findings.';
  updateFindingDetail();
  updateReadiness(false);
  wireMedia();
}

init();
