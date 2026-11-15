'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { coverage, dateText, kindLabels, recordsFor, selectionFor, stopNumbers, traversalText, type Atlas, type Collection, type Filter } from './model';
import { explorerLocationUrl, readExplorerLocation, type ExplorerPanel } from './location';
import CollectionCards from './CollectionCards';
import EvidenceStage from './EvidenceStage';
import { RecordCard } from './Evidence';
import { aerial } from './aerial';
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
  const all = collection ? recordsFor(atlas, collection) : [];
  const stops = useMemo(() => collection ? stopNumbers(collection) : new Map<string, number>(), [collection]);
  const counts = collection ? coverage(atlas, collection) : null;
  const pad = (n: number | undefined) => String(n ?? 0).padStart(2, '0');
  const filtered = Boolean(query) || filter !== 'all';
  // Details are a collapsible side panel ("map" in the URL = details hidden); a URL may also ask for them.
  const detailsOpen = panel !== 'map';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);
  const detailsToggle = useRef<HTMLButtonElement>(null);
  const selectRecord = (id: string) => { if (collection) setCollectionId(collection.id); setRecordId(id); setPanel(p => p === 'map' ? 'evidence' : p); };
  const chooseCollection = (c: Collection) => { setCollectionId(c.id); setRecordId(c.recordIds[0]); };
  const clear = () => { setFilter('all'); setQuery(''); };
  const index = record ? records.findIndex(r => r.id === record.id) : -1;
  const step = (offset: number) => { if (records.length) selectRecord(records[(index + offset + records.length) % records.length].id); };
  const feature = record ? atlas.features.find(f => f.id === record.featureId) : undefined;
  const chip = feature ? feature.geometry ? feature.properties.status ? `${cap(feature.type)} · ${feature.properties.status}` : cap(feature.type) : 'Not on map' : '';
  useEffect(() => { if (filtered) setFiltersOpen(true); }, [filtered]);
  // A deep link that asks for the evidence opens the details; on phones, bring them into view once.
  useEffect(() => {
    if (!locationReady || panel !== 'evidence' || window.matchMedia('(min-width: 951px)').matches) return;
    detailsRef.current?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationReady]);
  return <div className={styles.explorer}>
    <header className={styles.heading}>
      <div>
        <div className={styles.eyebrow}>PRINCETON / EVIDENCE ATLAS</div>
        <h1>Route explorer<span className={styles.headingDot}>.</span></h1>
        <p>Inspect archive paths, field photos, and conflicting records.</p>
      </div>
      <nav className={styles.pageLinks} aria-label="Related pages"><a href="/curb/collection">How collection would work →</a><a href="/curb/surveys/robertson-hall">Review Robertson survey →</a></nav>
    </header>
    <div className={styles.switcher}>
      <CollectionCards atlas={atlas} collections={collections} selectedId={collection?.id ?? null} onSelect={chooseCollection} />
      <details className={styles.filters} open={filtersOpen} onToggle={e => setFiltersOpen(e.currentTarget.open)}>
        <summary>Filter{filtered ? ' · on' : ''}</summary>
        <div className={styles.toolbar}>
          <label className={styles.search}><span aria-hidden="true">⌕</span><span className={styles.srOnly}>Search collections, features or record IDs</span><input value={query} onChange={e => setQuery(e.target.value)} maxLength={256} placeholder="Collection, place or source ID…" type="search" /></label>
          <label className={styles.filter}>Evidence type<select value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">All evidence</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <span className={styles.resultCount}>{collections.length} of {atlas.collections.length} collections</span>
          {filtered && <button type="button" className={styles.clear} onClick={clear}>Clear filters</button>}
        </div>
      </details>
    </div>
    <div className={styles.workspace} data-details={detailsOpen ? 'open' : 'closed'}>
      <section id="explorer-map" className={styles.mapPanel} aria-label="Evidence stage">
        <div className={styles.mapHeading}>
          <h2>{collection?.name ?? 'No matching evidence'}</h2>
          {counts && <span className={styles.coverage}><b>{counts.records}</b> records · <b>{counts.mappedRecords}</b> on map · <b>{counts.unplacedRecords}</b> not on map{counts.conflictRecords > 0 && <> · <b>{counts.conflictRecords}</b> in conflict</>}
            {records.length < all.length && <> · {records.length} match <button type="button" onClick={clear}>Show all</button></>}</span>}
          <span className={styles.traversal}>{collection ? traversalText(collection) : 'Current traversal: Unknown'}</span>
        </div>
        <EvidenceStage atlas={atlas} collection={collection} records={records} record={record} stops={stops} onSelect={selectRecord} onReset={clear} />
        {collection && record && <div className={styles.navigator} role="group" aria-label="Selected record">
          <button type="button" aria-label="Previous snapshot" onClick={() => step(-1)}>‹</button>
          <div className={styles.navCurrent} aria-live="off">
            <b>#{pad(stops.get(record.id))}</b>
            <span className={styles.navTitle}>{record.title}</span>
            <span className={styles.navMeta}>{chip} · {record.kind === 'archive' ? 'Source capture' : 'Photo captured'}: {dateText(record.captured)}</span>
          </div>
          <span className={styles.navCount}>{index + 1} / {records.length}</span>
          <button type="button" aria-label="Next snapshot" onClick={() => step(1)}>›</button>
          <button type="button" ref={detailsToggle} className={styles.detailsToggle} aria-expanded={detailsOpen} aria-controls="explorer-evidence"
            onClick={() => setPanel(detailsOpen ? 'map' : 'evidence')}>{detailsOpen ? 'Hide details' : 'Show details'}</button>
        </div>}
      </section>
      <aside id="explorer-evidence" ref={detailsRef} className={styles.drawer} aria-label="Selected evidence" data-open={detailsOpen}>
        <div className={styles.drawerHeading}><h2>Evidence detail</h2>
          <button type="button" className={styles.drawerClose} onClick={() => {
          setPanel('map');
          detailsToggle.current?.focus();
        }} aria-label="Hide details">×</button></div>
        {record ? <>
          {record.conflictGroup && <div className={styles.conflict}><strong>Records disagree.</strong> The stage shows both at equal size. No winner is selected.</div>}
          <RecordCard key={record.id} atlas={atlas} record={record} stop={stops.get(record.id)} hidePhoto={collection?.kind !== 'synthetic'} />
        </> : <div className={styles.empty}><h3>No matching evidence</h3><p>Unplaced and conflicting records remain in their collections.</p><button type="button" onClick={clear}>Show the complete atlas</button></div>}
        {record && <details className={styles.allRecords}><summary>All {all.length} records in source order</summary>{all.map(r => <button type="button" key={r.id} aria-current={r.id === record.id || undefined} onClick={() => { clear(); selectRecord(r.id); }}><span>#{pad(stops.get(r.id))} {r.title}</span><small>{r.id}{!atlas.features.find(f => f.id === r.featureId)?.geometry && ' · Not on map'}{r.conflictGroup && ' · Conflict'}</small></button>)}</details>}
      </aside>
    </div>
    <footer className={styles.attribution}>
      <span>Archive geometry © Delaware Valley Regional Planning Commission (DVRPC). <a href="https://catalog.dvrpc.org/dvrpc_data_license.html" target="_blank" rel="noreferrer">Data terms →</a></span>
      <span>{aerial.attribution} Exact capture date unknown; context only.</span>
      <span>Local catalog 2026-11-13 · no live updates</span>
    </footer>
    <p className={styles.srOnly} role="status" aria-live="polite">{collection ? `${collection.name}, ${records.length} matching records. ${record ? `Record ${stops.get(record.id)}: ${record.title}` : ''}. Current traversal unknown. ${counts?.unplacedRecords ?? 0} records not on the map in this collection.` : 'No matching evidence. Show the complete atlas to restore all collections.'}</p>
  </div>;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
