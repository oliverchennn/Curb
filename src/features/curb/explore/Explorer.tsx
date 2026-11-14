'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dateText, kindLabels, recordsFor, selectionFor, traversalText, type Atlas, type Filter } from './model';
import { explorerLocationUrl, readExplorerLocation, type ExplorerPanel } from './location';
import MapCanvas from './MapCanvas';
import { RecordCard, Snapshot } from './Evidence';
import styles from './Explorer.module.css';

export default function Explorer({ atlas }: { atlas: Atlas }) {
  const [filter, setFilter] = useState<Filter>('all'), [query, setQuery] = useState('');
  const [collectionId, setCollectionId] = useState(atlas.collections[0].id), [recordId, setRecordId] = useState(atlas.collections[0].recordIds[0]);
  const [panel, setPanel] = useState<ExplorerPanel>('map');
  const [locationReady, setLocationReady] = useState(false);
  const selected = useMemo(() => selectionFor(atlas, filter, query, collectionId, recordId), [atlas, filter, query, collectionId, recordId]);
  const { collection, record, records, collections } = selected;
  useEffect(() => {
    const restore = () => {
      if (window.location.pathname !== '/curb/explore') return;
      const saved = readExplorerLocation(atlas, window.location.search);
      setFilter(saved.filter); setQuery(saved.query); setCollectionId(saved.collectionId);
      setRecordId(saved.recordId); setPanel(saved.panel); setLocationReady(true);
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [atlas]);
  useEffect(() => {
    if (!locationReady || window.location.pathname !== '/curb/explore') return;
    const next = explorerLocationUrl(window.location.href, {
      collectionId: collection?.id ?? collectionId, recordId: record?.id ?? recordId, filter, query, panel,
    });
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      // Replace this page's entry: scrubbing snapshots must not create dozens of Back steps.
      // Next's native-history bridge retains its router state when passed null.
      window.history.replaceState(null, '', next);
    }
  }, [locationReady, collection?.id, record?.id, collectionId, recordId, filter, query, panel]);
  const routeButtons = useRef<(HTMLButtonElement | null)[]>([]), mobileTabs = useRef<(HTMLButtonElement | null)[]>([]);
  const all = collection ? recordsFor(atlas, collection) : [];
  const unplaced = all.filter(r => !atlas.features.find(f => f.id === r.featureId)?.geometry).length;
  const conflicts = all.filter(r => r.conflictGroup).length;
  const shownUnplaced = records.filter(r => !atlas.features.find(f => f.id === r.featureId)?.geometry).length;
  const paired = record?.conflictGroup ? all.filter(r => r.conflictGroup === record.conflictGroup) : [];
  const selectRecord = (id: string) => { if (collection) setCollectionId(collection.id); setRecordId(id); };
  const clear = () => { setFilter('all'); setQuery(''); };
  const index = record ? records.findIndex(r => r.id === record.id) : -1;
  const filmstrip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = filmstrip.current, button = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!strip || !button) return;
    if (button.offsetLeft < strip.scrollLeft) strip.scrollLeft = button.offsetLeft - 15;
    else if (button.offsetLeft + button.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = button.offsetLeft + button.offsetWidth - strip.clientWidth + 15;
  }, [record?.id]);
  const step = (offset: number) => { if (records.length) selectRecord(records[(index + offset + records.length) % records.length].id); };
  return <div className={styles.explorer}>
    <header className={styles.heading}>
      <div><div className={styles.eyebrow}>PRINCETON / EVIDENCE ATLAS</div><h1>Route explorer<span className={styles.headingDot}>.</span></h1><p>A closer look at the paths, the records, and what remains unknown.</p></div>
      <div className={styles.pageLinks}><span className={styles.localBadge}><i /> Local snapshot</span><a href="/curb/collection">How collection would work →</a><a href="/curb/surveys/robertson-hall">Review Robertson survey →</a></div>
    </header>
    <div className={styles.toolbar}>
      <label className={styles.search}><span aria-hidden="true">⌕</span><span className={styles.srOnly}>Search collections, features or record IDs</span><input value={query} onChange={e => setQuery(e.target.value)} maxLength={256} placeholder="Search a collection or source ID…" type="search" /></label>
      <label className={styles.filter}>Evidence type<select value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">All evidence</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <span className={styles.resultCount}>{collections.length} of {atlas.collections.length} collections</span>
      {(query || filter !== 'all') && <button className={styles.clear} onClick={clear}>Clear filters</button>}
    </div>
    <div className={styles.filterSummary}>{atlas.records.filter(r => !atlas.features.find(f => f.id === r.featureId)?.geometry).length} unplaced records · {atlas.records.filter(r => r.conflictGroup).length} illustrative conflict records in the atlas. {query || filter !== 'all' ? <button onClick={clear}>Show the complete atlas</button> : <span>Always available in their collection lists.</span>}</div>
    <div className={styles.mobileTabs} role="tablist" aria-label="Explorer panels">
      {(['map', 'routes', 'evidence'] as const).map((p, i) => <button key={p} ref={el => { mobileTabs.current[i] = el; }} role="tab" id={`explorer-tab-${p}`} aria-controls={`explorer-${p}`} aria-selected={panel === p} tabIndex={panel === p ? 0 : -1}
        onClick={() => setPanel(p)} onKeyDown={e => { const tabs = ['map', 'routes', 'evidence'] as const; const n = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1; if (n >= 0) { e.preventDefault(); setPanel(tabs[n]); mobileTabs.current[n]?.focus(); } }}>{p === 'routes' ? 'Collections' : p === 'map' ? 'Map & snapshots' : 'Evidence'}</button>)}
    </div>
    <div className={styles.workspace}>
      <aside id="explorer-routes" role="tabpanel" aria-labelledby="explorer-tab-routes" className={styles.rail} data-active={panel === 'routes'} aria-label="Collections">
        <div className={styles.railTitle}><h2>Collections</h2><span>{String(collections.length).padStart(2, '0')}</span></div>
        <div className={styles.routeList}>{collections.map((c, i) => <button key={c.id} ref={el => { routeButtons.current[i] = el; }} className={styles.routeButton} aria-pressed={collection?.id === c.id} data-collection={c.id}
          onClick={() => { setCollectionId(c.id); setRecordId(c.recordIds[0]); setPanel('map'); if (mobileTabs.current[0]?.getClientRects().length) mobileTabs.current[0].focus(); }}
          onKeyDown={e => { const n = e.key === 'ArrowDown' ? (i + 1) % collections.length : e.key === 'ArrowUp' ? (i - 1 + collections.length) % collections.length : -1; if (n >= 0) { e.preventDefault(); routeButtons.current[n]?.focus(); } }}>
          <span className={styles.routeCode} style={{ color: c.color }}>{c.code}<span aria-hidden="true">→</span></span>
          <strong>{c.name}</strong><span>{c.subtitle}</span><small>{kindLabels[c.kind]}</small><span className={styles.routeStats}>{c.recordIds.length} records <b>·</b> Traversal unknown</span>
        </button>)}</div>
        {!collections.length && <div className={styles.empty}><h3>No matching collections</h3><p>Try a source ID such as 834108, or clear the filters.</p><button onClick={clear}>Reset search & filters</button></div>}
        <div className={styles.railFoot}><strong>Inspect the evidence.</strong><p>These collections are not directions or verified accessible routes.</p></div>
      </aside>
      <section id="explorer-map" role="tabpanel" aria-labelledby="explorer-tab-map" className={styles.mapPanel} data-active={panel === 'map'} aria-label="Map and snapshots">
        <div className={styles.mapHeading}><div><span className={styles.eyebrow}>{collection ? `COLLECTION ${collection.code}` : 'EXPLORER'}</span><h2>{collection?.name ?? 'No matching records'}</h2></div><span className={styles.traversal}>{collection ? traversalText(collection) : 'Current traversal: Unknown'}</span></div>
        <MapCanvas atlas={atlas} collection={collection} records={records} selected={record} onSelect={selectRecord} />
        <div className={styles.coverage}><span><b>{records.length}</b> of {all.length} records <span aria-hidden="true">/</span> <b>{unplaced}</b> unplaced {shownUnplaced !== unplaced && `(${shownUnplaced} shown)`}{conflicts > 0 && ` / ${conflicts} conflicting example records`}</span>
          {records.length < all.length && <button onClick={clear}>Show all records</button>}</div>
        <p className={styles.collectionNote}>{collection?.note ?? 'All records remain available by clearing the filters.'}</p>
        <div className={styles.snapshotsHeader}><div><h2>Snapshots <span>{records.length ? `${index + 1} / ${records.length}` : '0'}</span></h2><p>{collection?.kind === 'archive' ? 'Source records · not a chronological capture sequence' : collection?.kind === 'field' ? 'Actual clip frames · precise locations unknown' : 'Illustrative records · not observations'}</p></div>
          <div><button aria-label="Previous snapshot" aria-disabled={!records.length} onClick={() => step(-1)}>←</button><button aria-label="Next snapshot" aria-disabled={!records.length} onClick={() => step(1)}>→</button></div></div>
        <div ref={filmstrip} className={styles.filmstrip} aria-label="Evidence snapshots">{records.map(r => <button key={r.id} className={styles.snapshotButton} aria-pressed={record?.id === r.id} onClick={() => selectRecord(r.id)} data-snapshot={r.id}>
          <Snapshot record={r} feature={atlas.features.find(f => f.id === r.featureId)!} compact /><strong>{r.title}</strong><span>{kindLabels[r.kind]}</span><small>{r.kind === 'archive' ? 'Source capture' : 'Photo captured'}: {dateText(r.captured)}</small>
        </button>)}</div>
        <button className={styles.mobileDetails} onClick={() => { setPanel('evidence'); mobileTabs.current[2]?.focus(); }}>Open selected evidence →</button>
      </section>
      <aside id="explorer-evidence" role="tabpanel" aria-labelledby="explorer-tab-evidence" className={styles.drawer} data-active={panel === 'evidence'} aria-label="Selected evidence">
        <div className={styles.drawerHeading}><h2>Evidence detail</h2><span>{record ? String(index + 1).padStart(2, '0') : '—'}</span></div>
        {paired.length > 1 ? <><div className={styles.conflict}><strong>Records disagree.</strong> Both are synthetic examples. Neither is treated as current; no winner is selected.</div><div className={styles.conflictPair}>{paired.map(r => <RecordCard key={r.id} atlas={atlas} record={r} comparison />)}</div></> : record ? <RecordCard key={record.id} atlas={atlas} record={record} /> : <div className={styles.empty}><h3>No matching evidence</h3><p>Unplaced and conflicting records remain in their collections.</p><button onClick={clear}>Reset search & filters</button></div>}
        {record && <details className={styles.allRecords}><summary>All {all.length} records in this collection</summary>{all.map(r => <button key={r.id} onClick={() => { clear(); selectRecord(r.id); }}><span>{r.title}</span><small>{r.id}{!atlas.features.find(f => f.id === r.featureId)?.geometry && ' · Unplaced'}{r.conflictGroup && ' · Conflict'}</small></button>)}</details>}
      </aside>
    </div>
    <footer className={styles.attribution}><span>Archive geometry © Delaware Valley Regional Planning Commission (DVRPC). <a href="https://catalog.dvrpc.org/dvrpc_data_license.html" target="_blank" rel="noreferrer">Data terms →</a></span><span>Local catalog 2026-11-13 · imagery capture unknown · no live updates</span></footer>
    <p className={styles.srOnly} role="status" aria-live="polite">{collection ? `${collection.name}, ${records.length} matching records. ${record?.title ?? ''}. Current traversal unknown. ${unplaced} unplaced records in this collection.` : 'No matching records. Clear filters to restore all collections.'}</p>
  </div>;
}
