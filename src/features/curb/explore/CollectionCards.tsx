'use client';
import { useRef } from 'react';
import { coverage, fitFeatures, kindLabels, locatedFeatures, project, recordsFor, vertices, type Atlas, type Collection } from './model';
import styles from './Explorer.module.css';

/** Overview cards: what each collection is, how much is on the map, and what you can inspect. */
export default function CollectionCards({ atlas, collections, selectedId, onSelect }: {
  atlas: Atlas; collections: Collection[]; selectedId: string | null; onSelect: (c: Collection) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={styles.cardList}>{collections.map((c, i) => {
    const k = coverage(atlas, c);
    const inspect = c.kind === 'archive' ? `${k.mappedFeatures} mapped archive features` : c.kind === 'field' ? `${k.photos} actual photographs` : 'two records that disagree';
    return <button key={c.id} ref={el => { buttons.current[i] = el; }} type="button" className={styles.collectionCard}
      aria-pressed={selectedId === c.id} data-collection={c.id} style={{ ['--accent' as string]: c.color }}
      aria-label={`${c.code} ${c.name}. ${kindLabels[c.kind]}. Inspect ${inspect}. ${k.records} records, ${k.mappedRecords} on map, ${k.unplacedRecords} not on map${k.conflictRecords ? `, ${k.conflictRecords} in conflict` : ''}.`}
      onClick={() => onSelect(c)}
      onKeyDown={e => { const n = e.key === 'ArrowDown' ? (i + 1) % collections.length : e.key === 'ArrowUp' ? (i - 1 + collections.length) % collections.length : -1; if (n >= 0) { e.preventDefault(); buttons.current[n]?.focus(); } }}>
      <Preview atlas={atlas} collection={c} />
      <span className={styles.cardBody}>
        <span className={styles.cardCode}>{c.code} · {kindLabels[c.kind]}</span>
        <strong>{c.name}</strong>
        <span className={styles.cardInspect}>Inspect {inspect}</span>
        <span className={styles.cardCounts}>
          <span>{k.records} records</span>
          {k.mappedRecords > 0 && <span>{k.mappedRecords} on map</span>}
          <span>{k.unplacedRecords} not on map</span>
          {k.conflictRecords > 0 && <span>{k.conflictRecords} in conflict</span>}
        </span>
      </span>
    </button>;
  })}</div>;
}

function Preview({ atlas, collection }: { atlas: Atlas; collection: Collection }) {
  const records = recordsFor(atlas, collection);
  if (collection.kind === 'field') {
    const photos = records.flatMap(r => r.media.status === 'available' ? [r.media.src] : []).slice(0, 3);
    return <span className={styles.cardPreview} aria-hidden="true" data-preview="photos">{photos.map(src => <img key={src} src={src} alt="" loading="lazy" />)}</span>;
  }
  if (collection.kind === 'synthetic') return <span className={styles.cardPreview} aria-hidden="true" data-preview="pair"><i /><i /></span>;
  const features = locatedFeatures(atlas, records);
  const [x, y, w, h] = fitFeatures(features);
  return <span className={styles.cardPreview} aria-hidden="true" data-preview="map">
    <svg viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {features.map(f => f.geometry?.type === 'LineString'
        ? <polyline key={f.id} points={vertices(f).map(p => project(p as [number, number]).join(',')).join(' ')} fill="none" stroke={collection.color} strokeWidth={3} strokeDasharray={f.type === 'crossing' ? '5 4' : undefined} vectorEffect="non-scaling-stroke" />
        : <circle key={f.id} cx={project(vertices(f)[0] as [number, number])[0]} cy={project(vertices(f)[0] as [number, number])[1]} r={w / 28} fill="#fffef8" stroke={collection.color} strokeWidth={2} strokeDasharray={f.properties.status === 'ASSUMED' ? '2 2' : undefined} vectorEffect="non-scaling-stroke" />)}
    </svg>
  </span>;
}
