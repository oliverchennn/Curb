'use client';

import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import AerialLayer from './AerialLayer';
import { campusAerial, countFailedTiles, visibleTiles } from './aerial';
import type { ProjectedView } from './campus';
import { robertsonFindings, robertsonSite } from './data';
import { project, type EvidenceRecord } from './model';
import { OSM_COPYRIGHT } from './OsmCredit';
import styles from './RobertsonInspection.module.css';

// The screenshot identifies the area around the previous pin 03. Individual placements are illustrative.
type Point = readonly [number, number];
const placements = new Map<string, { offset: Point; callout: Point }>([
  ['robertson:defect-01', { offset: [-4.6, 1.4], callout: [16, 88] }],
  ['robertson:defect-02', { offset: [-2.3, .7], callout: [42, 88] }],
  ['robertson:defect-03', { offset: [0, 0], callout: [84, 16] }],
  // The surface breakup sits on the protrusion. The last pin continues along the main sidewalk.
  ['robertson:defect-04', { offset: [5.4, 3.8], callout: [70, 88] }],
  ['robertson:defect-05', { offset: [8.1, -2.45], callout: [84, 43] }],
]);
const [siteX, siteY] = project([robertsonSite.longitude, robertsonSite.latitude]);
const area: Point = [siteX - 24, siteY + 8];
// Robertson Hall footprint from src/data/curb/surveys/robertson-context.geojson (OpenStreetMap).
const hall: [number, number][] = [
  [-74.6551361, 40.3483919], [-74.6550984, 40.3483448], [-74.6550387, 40.3482699],
  [-74.6549412, 40.3481451], [-74.654283, 40.3484453], [-74.654482, 40.3486954],
];
const hallOutline = hall.map(coordinate => project(coordinate).join(',')).join(' ');
const hallCenter = project([-74.65472, 40.34842]);
const overview: ProjectedView = [siteX - 89, siteY - 60, 128, 96];
const overviewTiles = visibleTiles(overview, Infinity);
const hallLabelPosition = {
  left: `${(hallCenter[0] - overview[0]) / overview[2] * 100}%`,
  top: `${(hallCenter[1] - overview[1]) / overview[3] * 100}%`,
};
const inspectionId = 'robertson-inspection';

export default function RobertsonInspection({ records, record, stops, onInspect, children }: {
  records: EvidenceRecord[];
  record: EvidenceRecord;
  stops: Map<string, number>;
  onInspect: (id: string) => void;
  children: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const pin = placements.get(record.featureId);
  const zoomed = focused && Boolean(pin);
  const view: ProjectedView = focused && pin
    ? [area[0] + pin.offset[0] - 8, area[1] + pin.offset[1] - 6, 16, 12]
    : overview;
  const tiles = zoomed ? visibleTiles(view, Infinity) : overviewTiles;
  const detailFailed = countFailedTiles(tiles, failed);
  const noAerial = failed.has(campusAerial.overview.src) && detailFailed === tiles.length;
  const finding = robertsonFindings.get(record.featureId);
  const pins = records.flatMap(item => {
    const placement = placements.get(item.featureId);
    return placement ? [{ item, ...placement, code: String(stops.get(item.id)).padStart(2, '0') }] : [];
  });
  const markers = pins.filter(({ item }) => !zoomed || item.id === record.id).map(({ item, offset, callout, code }) => ({
    item, code, callout: zoomed ? [75, 28] : callout,
    left: (area[0] + offset[0] - view[0]) * 100 / view[2],
    top: (area[1] + offset[1] - view[1]) * 100 / view[3],
  }));

  function inspect(event: MouseEvent<HTMLButtonElement>, id: string) {
    setFocused(true);
    onInspect(id);
    if (event.detail === 0) {
      requestAnimationFrame(() => inspectorHeading.current?.focus());
    } else if (window.matchMedia('(max-width: 760px)').matches) {
      requestAnimationFrame(() => inspectorHeading.current?.scrollIntoView({ block: 'nearest' }));
    }
  }

  return <div className={styles.layout}>
    <section aria-labelledby="robertson-map-title" className={styles.mapPanel}>
      <div className={styles.panelHeading}>
        <div>
          <h3 id="robertson-map-title">Crack map</h3>
          <p>Select a pin or photo to inspect a finding.</p>
        </div>
        <button type="button" className={styles.fit} onClick={() => setFocused(false)}>Fit area</button>
      </div>
      <p className={styles.placement}>Demo pins within the marked area. Individual crack locations are unverified.</p>
      <div className={styles.map} data-zoom={zoomed ? 'finding' : 'site'}>
        <svg className={styles.aerial} viewBox={view.join(' ')} aria-hidden="true">
          <AerialLayer set="campus" tiles={tiles} failed={failed} onFail={src => setFailed(previous => new Set(previous).add(src))} />
          {!zoomed ? <polygon className={styles.hallOutline} points={hallOutline} vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        {zoomed ? <span className={styles.mapLabel}>Finding view</span>
          : <span className={styles.hallLabel} style={hallLabelPosition}>Robertson Hall</span>}
        <svg className={styles.leaders} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {markers.map(({ item, left, top, callout: [x, y] }) =>
            <line key={item.id} x1={left} y1={top} x2={x} y2={y} vectorEffect="non-scaling-stroke" />)}
        </svg>
        {markers.map(({ item, left, top, callout: [x, y], code }) =>
          <div className={styles.annotation} key={item.id} data-finding={item.featureId}>
            <button type="button" className={styles.marker} style={{ left: `${left}%`, top: `${top}%` }}
              aria-label={`Inspect ${item.title} on the demo map`} aria-controls={inspectionId} aria-pressed={item.id === record.id}
              onClick={event => inspect(event, item.id)}>
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <rect x="2" y="2" width="40" height="40" fill="currentColor" stroke="#14110b" strokeWidth="3" />
                <path d={item.featureId === 'robertson:defect-04'
                  ? 'M11 18 19 11 29 13 34 19 30 29 21 32 12 27Z M11 18 5 14 M31 28 36 34'
                  : 'M9 27 17 18 22 25 29 15 35 20'} fill="none" stroke="#14110b" strokeWidth="4.5" strokeLinecap="square" />
              </svg>
            </button>
            <button type="button" className={styles.callout} style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`Inspect ${item.title} from its photo`} aria-controls={inspectionId} aria-pressed={item.id === record.id}
              onClick={event => inspect(event, item.id)}>
              {item.media.status === 'available' ? <img src={item.media.src} alt="" /> : null}
              <span>{code}</span>
            </button>
          </div>)}
      </div>
      {noAerial ? <p role="status" className={styles.mapStatus}>Aerial imagery is unavailable. The demo boxes still open the original photos.</p>
        : detailFailed > 0 ? <p role="status" className={styles.mapStatus}>Some detail imagery is unavailable. The map is using the available aerial imagery.</p> : null}
      <p className={styles.credit}><a href={campusAerial.sourceUrl}>{campusAerial.captureYear} aerial imagery · NJ Office of GIS</a>
        {!zoomed ? <> · <a href={OSM_COPYRIGHT}>Building outline © OpenStreetMap contributors</a></> : null}</p>
      {zoomed ? <div className={styles.findings} role="group" aria-label="Robertson findings">
        {pins.map(({ item, code }) => <button type="button" key={item.id} title={item.title} aria-label={`Inspect ${item.title}`} aria-controls={inspectionId}
          aria-pressed={item.id === record.id} onClick={event => inspect(event, item.id)}>{code}</button>)}
      </div> : null}
    </section>
    <section className={styles.inspector} id={inspectionId} aria-labelledby="robertson-inspection-title">
      <div className={styles.inspectorHeading}>
        <p>Actual survey footage</p>
        <h3 id="robertson-inspection-title" ref={inspectorHeading} tabIndex={-1}>{record.title}</h3>
      </div>
      {children}
      {finding ? <div className={styles.findingDetail}>
        <p>{finding.description}</p>
        <p><strong>Possible access impact</strong> {finding.assessment.accessImpacts[0]}</p>
        <details key={record.id}>
          <summary>Field measurements to collect</summary>
          <ul>{finding.assessment.measurementNeeds.map(need => <li key={need}>{need}</li>)}</ul>
        </details>
        <p className={styles.reviewNote}>AI-assisted finding · {finding.review.status === 'pending' ? 'field review pending' : finding.review.status} · Exact location unknown</p>
        <a href={`/curb/surveys/robertson-hall?finding=${encodeURIComponent(finding.id)}`}>Review finding in the survey <span aria-hidden="true">→</span></a>
      </div> : null}
    </section>
  </div>;
}
