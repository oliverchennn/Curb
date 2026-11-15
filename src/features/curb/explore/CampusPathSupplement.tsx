import supplement from '../../../data/curb/princeton-route-demo/dvrpc-gaps.json';
import { project } from './model';
import styles from './Explorer.module.css';

const gapPath = supplement.segments.map(segment =>
  segment.coordinates.map(([lon, lat], i) =>
    `${i === 0 ? 'M' : 'L'}${project([lon, lat]).join(',')}`).join(' ')).join(' ');

export function CampusPathSupplement() {
  return <path d={gapPath} className={styles.campusGapPath} data-campus-gap-count={supplement.segments.length}
    vectorEffect="non-scaling-stroke" aria-hidden="true" />;
}

export function CampusGapLegend() {
  return <li>
    <svg width="30" height="12" aria-hidden="true"><path d="M0 6H30" className={styles.campusGapPath} /></svg>
    <span>Corroborated gaps <b>{supplement.segments.length}</b></span>
  </li>;
}

export function CampusGapAttribution() {
  return <p><strong>Supplemental paths:</strong> {supplement.segments.length} segments from the <a href={supplement.sourceUrl}>DVRPC Pedestrian Network</a>, checked against the <a href={supplement.referenceUrl}>Princeton Facilities map</a>. <a href={supplement.dataTerms}>DVRPC data terms</a>. Current conditions remain unverified.</p>;
}
