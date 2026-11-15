'use client';
import { useRef } from 'react';
import { coverage, kindLabels, type Atlas, type Collection } from './model';
import styles from './Explorer.module.css';

const shortKind = { archive: 'Archive map', field: 'Field photos', synthetic: 'Examples' } as const;

/** One compact collection switcher: a single action changes collection. Counts live in the accessible name
 *  and the stage header, not repeated on every chip. */
export default function CollectionCards({ atlas, collections, selectedId, onSelect }: {
  atlas: Atlas; collections: Collection[]; selectedId: string | null; onSelect: (c: Collection) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={styles.chipRow} role="group" aria-label="Collections">{collections.map((c, i) => {
    const k = coverage(atlas, c);
    const inspect = c.kind === 'archive' ? `${k.mappedFeatures} mapped archive features` : c.kind === 'field' ? `${k.photos} actual photographs` : 'two records that disagree';
    return <button key={c.id} ref={el => { buttons.current[i] = el; }} type="button" className={styles.collectionChip}
      aria-pressed={selectedId === c.id} data-collection={c.id} style={{ ['--accent' as string]: c.color }}
      aria-label={`${c.code} ${c.name}. ${kindLabels[c.kind]}. Inspect ${inspect}. ${k.records} records, ${k.mappedRecords} on map, ${k.unplacedRecords} not on map${k.conflictRecords ? `, ${k.conflictRecords} in conflict` : ''}.`}
      onClick={() => onSelect(c)}
      onKeyDown={e => {
        const next = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
        if (next) { e.preventDefault(); buttons.current[(i + next + collections.length) % collections.length]?.focus(); }
      }}>
      <i aria-hidden="true" />
      <span className={styles.chipText}><strong>{c.name}</strong><small>{c.code} · {shortKind[c.kind]}</small></span>
    </button>;
  })}</div>;
}
