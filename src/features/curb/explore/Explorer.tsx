'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { coverage, dateText, kindLabels, recordsFor, selectionFor, stopNumbers, traversalText, type Atlas, type Collection, type Filter } from './model';
import { explorerLocationUrl, readExplorerLocation, type ExplorerPanel } from './location';
import CollectionCards from './CollectionCards';
import EvidenceStage from './EvidenceStage';
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
  const mobileTabs = useRef<(HTMLButtonElement | null)[]>([]);
  const all = collection ? recordsFor(atlas, collection) : [];
  const stops = useMemo(() => collection ? stopNumbers(collection) : new Map<string, number>(), [collection]);
  const counts = collection ? coverage(atlas, collection) : null;
  const pad = (n: number | undefined) => String(n ?? 0).padStart(2, '0');
  const selectRecord = (id: string) => { if (collection) setCollectionId(collection.id); setRecordId(id); };
  const chooseCollection = (c: Collection) => {
    setCollectionId(c.id); setRecordId(c.recordIds[0]); setPanel('map');
    if (mobileTabs.current[0]?.getClientRects().length) mobileTabs.current[0].focus();
  };
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
  const filtered = Boolean(query) || filter !== 'all';
  const stageNote = collection?.kind === 'archive' ? 'Archive geometry · numbers follow source order, not travel'
    : collection?.kind === 'field' ? 'Actual clip frames · precise locations unknown'
    : collection ? 'Illustrative records · not observations' : 'Every record is still in the atlas.';
  return <div className={styles.explorer}>
    <header className={styles.heading}>
      <div><div className={styles.eyebrow}>PRINCETON / EVIDENCE ATLAS</div><h1>Route explorer<span className={styles.headingDot}>.</span></h1><p>Pick a collection, then inspect its map, photographs or disagreement. Nothing here is a verified accessible route.</p></div>
      <div className={styles.pageLinks}><span className={styles.localBadge}><i /> Local snapshot</span><a href="/curb/collection">How collection would work →</a><a href="/curb/surveys/robertson-hall">Review Robertson survey →</a></div>
    </header>
    <div className={styles.toolbar}>
      <label className={styles.search}><span aria-hidden="true">⌕</span><span className={styles.srOnly}>Search collections, features or record IDs</span><input value={query} onChange={e => setQuery(e.target.value)} maxLength={256} placeholder="Search a collection or source ID…" type="search" /></label>
      <label className={styles.filter}>Evidence type<select value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">All evidence</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <span className={styles.resultCount}>{collections.length} of {atlas.collections.length} collections</span>
      {filtered && <button className={styles.clear} onClick={clear}>Clear filters</button>}
    </div>
    <div className={styles.mobileTabs} role="tablist" aria-label="Explorer panels">
      {(['map', 'routes', 'evidence'] as const).map((p, i) => <button key={p} ref={el => { mobileTabs.current[i] = el; }} role="tab" id={`explorer-tab-${p}`} aria-controls={`explorer-${p}`} aria-selected={panel === p} tabIndex={panel === p ? 0 : -1}
        onClick={() => setPanel(p)} onKeyDown={e => { const tabs = ['map', 'routes', 'evidence'] as const; const n = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1; if (n >= 0) { e.preventDefault(); setPanel(tabs[n]); mobileTabs.current[n]?.focus(); } }}>{p === 'routes' ? 'Collections' : p === 'map' ? 'Stage' : 'Evidence'}</button>)}
    </div>
    <div className={styles.workspace}>
      <aside id="explorer-routes" role="tabpanel" aria-labelledby="explorer-tab-routes" className={styles.rail} data-active={panel === 'routes'} aria-label="Collections">
        <div className={styles.railTitle}><h2>Collections</h2><span>{pad(collections.length)}</span></div>
        <CollectionCards atlas={atlas} collections={collections} selectedId={collection?.id ?? null} onSelect={chooseCollection} />
        {!collections.length && <div className={styles.empty}><h3>No matching collections</h3><p>Try a source ID such as 834108. Nothing has been removed.</p><button onClick={clear}>Show the complete atlas</button></div>}
        <div className={styles.railFoot}><strong>Inspect the evidence.</strong><p>Collections group records. They are not directions or verified accessible routes.</p></div>
      </aside>
      <section id="explorer-map" role="tabpanel" aria-labelledby="explorer-tab-map" className={styles.mapPanel} data-active={panel === 'map'} aria-label="Evidence stage">
        <div className={styles.mapHeading}>
          <div><span className={styles.eyebrow} style={collection ? { color: collection.color } : undefined}>{collection ? `${collection.code} · ${kindLabels[collection.kind].toUpperCase()}` : 'EXPLORER'}</span><h2>{collection?.name ?? 'No matching evidence'}</h2><p>{stageNote}</p></div>
          <span className={styles.traversal}>{collection ? traversalText(collection) : 'Current traversal: Unknown'}</span>
        </div>
        {counts && <div className={styles.coverage}><span><b>{counts.records}</b> records · <b>{counts.mappedRecords}</b> on map · <b>{counts.unplacedRecords}</b> not on map{counts.photos > 0 && <> · <b>{counts.photos}</b> photos</>}{counts.conflictRecords > 0 && <> · <b>{counts.conflictRecords}</b> in conflict</>}</span>
          {records.length < all.length && <span className={styles.filteredNote}>{records.length} match the filter. <button onClick={clear}>Show all {all.length}</button></span>}</div>}
        <EvidenceStage atlas={atlas} collection={collection} records={records} record={record} stops={stops} onSelect={selectRecord} onReset={clear} />
        {collection && <>
          <div className={styles.snapshotsHeader}><div><h2>{collection.kind === 'field' ? 'Frames' : 'Records'} <span>{records.length ? `${index + 1} / ${records.length}` : '0'}</span></h2><p>{collection.kind === 'archive' ? 'Source order · not a chronological capture sequence' : collection.kind === 'field' ? 'Clip order · not a walking route' : 'Both sides of the disagreement'}</p></div>
            <div><button aria-label="Previous snapshot" aria-disabled={!records.length} onClick={() => step(-1)}>←</button><button aria-label="Next snapshot" aria-disabled={!records.length} onClick={() => step(1)}>→</button></div></div>
          <div ref={filmstrip} className={styles.filmstrip} role="group" aria-label="Evidence reel">{records.map(r => {
            const feature = atlas.features.find(f => f.id === r.featureId)!;
            const chip = feature.geometry ? feature.properties.status ? `${feature.type} · ${feature.properties.status}` : feature.type : 'Not on map';
            return <button key={r.id} className={styles.snapshotButton} aria-pressed={record?.id === r.id} onClick={() => selectRecord(r.id)} data-snapshot={r.id}>
              <span className={styles.reelThumb}><Snapshot record={r} feature={feature} compact /><b className={styles.reelStop}>#{pad(stops.get(r.id))}</b></span>
              <strong>{r.title}</strong>
              <span className={styles.reelChips}><span>{chip}</span><span>{r.kind === 'archive' ? 'Source capture' : 'Photo captured'}: {dateText(r.captured)}</span></span>
            </button>;
          })}</div>
          <button className={styles.mobileDetails} onClick={() => { setPanel('evidence'); mobileTabs.current[2]?.focus(); }}>Open selected evidence →</button>
        </>}
      </section>
      <aside id="explorer-evidence" role="tabpanel" aria-labelledby="explorer-tab-evidence" className={styles.drawer} data-active={panel === 'evidence'} aria-label="Selected evidence">
        <div className={styles.drawerHeading}><h2>Evidence detail</h2><span>{record ? `#${pad(stops.get(record.id))}` : '—'}</span></div>
        {record ? <>
          {record.conflictGroup && <div className={styles.conflict}><strong>Records disagree.</strong> The stage shows both at equal size. No winner is selected.</div>}
          <RecordCard key={record.id} atlas={atlas} record={record} stop={stops.get(record.id)} hidePhoto={collection?.kind === 'field'} />
        </> : <div className={styles.empty}><h3>No matching evidence</h3><p>Unplaced and conflicting records remain in their collections.</p><button onClick={clear}>Show the complete atlas</button></div>}
        {record && <details className={styles.allRecords}><summary>All {all.length} records in this collection</summary>{all.map(r => <button key={r.id} onClick={() => { clear(); selectRecord(r.id); }}><span>#{pad(stops.get(r.id))} {r.title}</span><small>{r.id}{!atlas.features.find(f => f.id === r.featureId)?.geometry && ' · Not on map'}{r.conflictGroup && ' · Conflict'}</small></button>)}</details>}
      </aside>
    </div>
    <footer className={styles.attribution}><span>Archive geometry © Delaware Valley Regional Planning Commission (DVRPC). <a href="https://catalog.dvrpc.org/dvrpc_data_license.html" target="_blank" rel="noreferrer">Data terms →</a></span><span>Local catalog 2026-11-13 · imagery capture unknown · no live updates</span></footer>
    <p className={styles.srOnly} role="status" aria-live="polite">{collection ? `${collection.name}, ${records.length} matching records. ${record ? `Record ${stops.get(record.id)}: ${record.title}` : ''}. Current traversal unknown. ${counts?.unplacedRecords ?? 0} records not on the map in this collection.` : 'No matching evidence. Show the complete atlas to restore all collections.'}</p>
  </div>;
}
