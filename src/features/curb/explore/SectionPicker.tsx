'use client';
import type { Collection } from './model';
import type { CampusSection } from './campus';
import styles from './Explorer.module.css';

/** Native section selector with previous/next and a way back to the overview. Any number of sections, one control. */
export default function SectionPicker({ sections, collections, current, onPick, onOverview, clearsSearch }: {
  sections: CampusSection[]; collections: Collection[]; current: string | null;
  onPick: (collectionId: string) => void; onOverview: () => void; clearsSearch: boolean;
}) {
  const shown = new Set(collections.map(c => c.id));
  const list = sections.filter(s => shown.has(s.collectionId));
  const i = list.findIndex(s => s.collectionId === current);
  const step = (d: number) => { if (list.length) onPick(list[(Math.max(i, 0) + d + list.length) % list.length].collectionId); };
  return <div className={styles.sectionPicker} role="group" aria-label="Campus sections">
    <label>
      <span>Campus section</span>
      <select value={i >= 0 ? current! : ''} onChange={e => { if (e.target.value) onPick(e.target.value); }}>
        {i < 0 && <option value="">Overview · choose a section…</option>}
        {list.map(s => <option key={s.collectionId} value={s.collectionId}>{s.code} · {s.areaLabel} {s.section}/{s.sectionsInArea} · {s.wayCount} ways</option>)}
      </select>
    </label>
    <button type="button" aria-label="Previous section" onClick={() => step(-1)} disabled={!list.length}>‹</button>
    <button type="button" aria-label="Next section" onClick={() => step(i < 0 ? 0 : 1)} disabled={!list.length}>›</button>
    {i >= 0 && <button type="button" className={styles.overviewButton} onClick={onOverview}>Back to campus overview{clearsSearch ? ' · clear search' : ''}</button>}
    <span className={styles.pickerCount}>{list.length} of {sections.length} sections</span>
  </div>;
}
