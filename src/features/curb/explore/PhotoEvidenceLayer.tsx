'use client';
import { PHOTO_TARGET, layoutPhotoMarkers, photoMarkerLabels, type PhotoEvidence, type PhotoMarker } from './photoEvidence';
import styles from './PhotoEvidence.module.css';

export type PhotoLayer = {
  records: readonly PhotoEvidence[];
  selectedId: string | null;
  request: { coordinates: [number, number]; focusMap?: boolean } | null;
  onSelect: (id: string, keyboard: boolean) => void;
};

export function PhotoGlyph({ kind }: { kind: PhotoMarker }) {
  if (kind === 'viewpoint') return <>
    <rect x="-11" y="-11" width="22" height="22" rx="2" fill="#234160" stroke="#faffff" strokeWidth="1.6" />
    <path d="M-7-3h3l1.4-2h5.2L4-3h3v8H-7Z" fill="none" stroke="#fff" strokeWidth="1.35" strokeLinejoin="round" />
    <circle cy="1" r="2.25" fill="none" stroke="#fff" strokeWidth="1.25" />
  </>;
  if (kind === 'possible-concern') return <>
    <path d="M0-12 12 10H-12Z" fill="#ffd174" stroke="#653718" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M0-4v6" stroke="#50280f" strokeWidth="2.3" strokeLinecap="round" />
    <circle cy="5.5" r="1.25" fill="#50280f" />
  </>;
  return <>
    <path d="M-5-11H5L11-5V5L5 11H-5L-11 5V-5Z" fill="#782b37" stroke="#fff" strokeWidth="1.6" />
    <path d="M0-5v6" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
    <circle cy="5" r="1.25" fill="#fff" />
  </>;
}

export function PhotoLegend({ kinds }: { kinds: readonly PhotoMarker[] }) {
  return <ul className={styles.legend} aria-label="Photo evidence symbols">
    {kinds.map(kind => <li key={kind}>
      <svg width="23" height="23" viewBox="-13 -13 26 26" aria-hidden="true"><PhotoGlyph kind={kind} /></svg>
      {photoMarkerLabels[kind]}
    </li>)}
  </ul>;
}

export function PhotoEvidenceLayer({ markers, unit, onSelect }: {
  markers: ReturnType<typeof layoutPhotoMarkers>; unit: number; onSelect: PhotoLayer['onSelect'];
}) {
  return <g role="group" aria-label="Photo evidence map markers">
    {markers.map(({ id, title, kind, x, y, selected, interactive }) => {
      const size = interactive ? PHOTO_TARGET : 28;
      return <g key={id} transform={`translate(${x} ${y}) scale(${unit})`}
        role="button" tabIndex={0} aria-pressed={selected} aria-label={`${title} · ${photoMarkerLabels[kind]}`}
        className={styles.marker} data-photo-marker={id} data-photo-kind={kind}
        onClick={() => onSelect(id, false)}
        onKeyDown={event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onSelect(id, true);
        }}>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} fill="transparent" />
        <g pointerEvents="none">
          <rect x="-16" y="-16" width="32" height="32" rx="4" fill="none" stroke="#181c24" strokeWidth="4" className={styles.focusRing} />
          <rect x="-16" y="-16" width="32" height="32" rx="4" fill="none" stroke="#fff" strokeWidth="2" className={styles.focusRing} />
          <PhotoGlyph kind={kind} />
        </g>
      </g>;
    })}
  </g>;
}
