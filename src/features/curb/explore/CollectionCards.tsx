'use client';
import { useRef } from 'react';
import { coverage, kindLabels, type Atlas, type Collection } from './model';
import { GROUPS, collectionsIn, type GroupId } from './groups';
import styles from './Explorer.module.css';

const GROUP_COLORS: Record<GroupId, string> = { campus: '#236d83', downtown: '#4e68a0', field: '#815e83' };

/** Show groups with matching Explorer collections. */
export default function GroupChips({ visible, current, onGroup }: {
  visible: Collection[]; current: GroupId | null; onGroup: (g: GroupId) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const groups = GROUPS.filter(g => collectionsIn(g.id, visible).length > 0);
  return <div className={styles.chipRow} role="group" aria-label="Evidence groups">{groups.map((g, i) => {
    const n = collectionsIn(g.id, visible).length;
    return <button key={g.id} ref={el => { buttons.current[i] = el; }} type="button" className={styles.collectionChip}
      aria-pressed={current === g.id} data-group={g.id} style={{ ['--accent' as string]: GROUP_COLORS[g.id] }}
      aria-label={`${g.label}. ${g.detail}. ${n} ${n === 1 ? 'collection' : 'collections'} shown.`}
      onClick={() => onGroup(g.id)}
      onKeyDown={e => {
        const d = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
        if (d) { e.preventDefault(); buttons.current[(i + d + groups.length) % groups.length]?.focus(); }
      }}>
      <i aria-hidden="true" />
      <span className={styles.chipText}><strong>{g.label}</strong><small>{g.detail}</small></span>
    </button>;
  })}</div>;
}

/** Sub-chips for a group with a few named collections (Downtown). Existing collection IDs and deep links unchanged. */
export function CollectionChips({ atlas, collections, selectedId, onSelect }: {
  atlas: Atlas; collections: Collection[]; selectedId: string | null; onSelect: (c: Collection) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={styles.subChipRow} role="group" aria-label="Downtown collections">{collections.map((c, i) => {
    const k = coverage(atlas, c);
    return <button key={c.id} ref={el => { buttons.current[i] = el; }} type="button" className={styles.subChip}
      aria-pressed={selectedId === c.id} data-collection={c.id} style={{ ['--accent' as string]: c.color }}
      aria-label={`${c.code} ${c.name}. ${kindLabels[c.kind]}. ${k.records} records, ${k.mappedRecords} on map, ${k.unplacedRecords} not on map.`}
      onClick={() => onSelect(c)}
      onKeyDown={e => {
        const d = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
        if (d) { e.preventDefault(); buttons.current[(i + d + collections.length) % collections.length]?.focus(); }
      }}>
      <i aria-hidden="true" /><span>{c.name}</span><small>{c.code}</small>
    </button>;
  })}</div>;
}
