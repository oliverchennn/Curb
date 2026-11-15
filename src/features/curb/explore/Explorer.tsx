'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { coverage, dateText, kindLabels, recordsFor, selectionFor, stopNumbers, traversalText, type Atlas, type Collection, type Filter } from './model';
import { DEFAULT_POINT_LOCATION, explorerLocationUrl, getCampusPointRecords, readExplorerLocation, searchable, type CampusPointLocation, type ExplorerPanel } from './location';
import { countCampusPoints, findCampusPoint, selectCampusPoints, type CampusPoint, type CampusPointFilter } from '../../../data/curb/princeton-campus-points/adapter';
import { PhotoEvidenceBrowser } from './PhotoEvidenceBrowser';
import { PhotoLegend, type PhotoLayer } from './PhotoEvidenceLayer';
import { findPhotoEvidence, getPhotoEvidence, photoPin, type PhotoMarker } from './photoEvidence';
import photoStyles from './PhotoEvidence.module.css';
import CampusPointBrowser from './CampusPointBrowser';
import { CampusPointLegend, type CampusPointLayer } from './CampusPointMarkers';
import GroupChips, { CollectionChips } from './CollectionCards';
import EvidenceStage from './EvidenceStage';
import OverviewMap from './OverviewMap';
import SectionPicker from './SectionPicker';
import { RecordCard } from './Evidence';
import { aerial } from './aerial';
import { campusCounts, campusPaths, campusRetrievedAt, campusSourceTags } from './campus';
import { campusSections, collectionsIn, explorerAtlas, groupOf, isCampus, sourceClass, type GroupId } from './groups';
import { OsmCredit } from './OsmCredit';
import styles from './Explorer.module.css';

const photoRecords = getPhotoEvidence();
const markerOrder: PhotoMarker[] = ['viewpoint', 'possible-concern', 'reviewed-barrier'];
const photoKinds = markerOrder.filter(kind => photoRecords.some(item => photoPin(item)?.kind === kind));
function photoPinIfSet(id?: string) {
  const record = id ? findPhotoEvidence(id) : null;
  return record ? photoPin(record) : null;
}

function pointInventory(state: CampusPointLocation, section: string | null) {
  const records = getCampusPointRecords();
  const filter: CampusPointFilter = {};
  const query = state.query.trim();
  if (/^node\/\d+$/i.test(query)) {
    const exact = findCampusPoint(records, query.toLowerCase());
    filter.nodeIds = exact ? [exact.sourceNode.id] : [];
  } else {
    filter.query = query;
  }
  switch (state.scope) {
    case 'section': if (section) filter.sectionCollectionIds = [section]; break;
    case 'context': filter.boundaryStatus = 'retained-way-context'; break;
    case 'unlinked': filter.linkStatus = 'unlinked'; break;
    case 'review': filter.locationStatus = 'location-review-needed'; break;
  }
  const inventory = selectCampusPoints(records, filter);
  const results = state.categories.length ? selectCampusPoints(inventory, { categories: state.categories }) : inventory;
  return { results, counts: countCampusPoints(results), memberships: countCampusPoints(inventory).categoryMemberships };
}

export default function Explorer({ atlas: fullAtlas }: { atlas: Atlas }) {
  const atlas = useMemo(() => explorerAtlas(fullAtlas), [fullAtlas]);
  const initial = atlas.collections.find(collection => isCampus(collection.id)) ?? atlas.collections[0];
  const [filter, setFilter] = useState<Filter>('all'), [query, setQuery] = useState('');
  const [collectionId, setCollectionId] = useState(initial.id), [recordId, setRecordId] = useState(initial.recordIds[0]);
  const [panel, setPanel] = useState<ExplorerPanel>('map');
  const [overview, setOverview] = useState(true);
  const [locationReady, setLocationReady] = useState(false);
  const [pointLocation, setPointLocation] = useState<CampusPointLocation>();
  const [pointBrowserOpen, setPointBrowserOpen] = useState(false);
  const [pointRequest, setPointRequest] = useState<CampusPointLayer['request']>(null);
  const [photoHidden, setPhotoHidden] = useState(false);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoRequest, setPhotoRequest] = useState<PhotoLayer['request']>(null);
  const photoBrowse = useRef<HTMLButtonElement>(null);
  const photoHeading = useRef<HTMLHeadingElement>(null);
  const pendingPhotoFocus = useRef<'focus' | 'reveal' | null>(null);
  const browseButton = useRef<HTMLButtonElement>(null);
  const pointHeading = useRef<HTMLHeadingElement>(null);
  const pendingPointFocus = useRef<'heading' | 'scroll' | 'way' | null>(null);
  const selected = useMemo(() => selectionFor(atlas, filter, searchable(query), collectionId, recordId), [atlas, filter, query, collectionId, recordId]);
  const { collection, record, records, collections } = selected;
  const filtered = Boolean(query) || filter !== 'all';
  // Archive is the type of every campus way, so it can stay selected at overview scale.
  const showOverview = overview && !query.trim() && collections.some(c => isCampus(c.id));
  const campusView = showOverview || isCampus(collection?.id);
  const activePoints = campusView ? pointLocation : undefined;
  const pointSection = !showOverview && collection && isCampus(collection.id) ? collection.id : null;
  const inventory = useMemo(() => activePoints ? pointInventory(activePoints, pointSection) : null, [activePoints, pointSection]);
  const selectedPoint = activePoints?.node ? findCampusPoint(getCampusPointRecords(), activePoints.node) : null;
  const showPhotos = campusView && photoRecords.length > 0 && !photoHidden;
  const selectedPhoto = showPhotos ? findPhotoEvidence(photoId) : null;
  const showPhotoBrowser = showPhotos && photoOpen;
  const showPointBrowser = Boolean(activePoints && inventory && pointBrowserOpen) && !showPhotoBrowser;
  useEffect(() => {
    const restore = () => {
      if (window.location.pathname !== '/curb/explore') return;
      const saved = readExplorerLocation(fullAtlas, window.location.search);
      setFilter(saved.filter); setQuery(saved.query); setCollectionId(saved.collectionId);
      setRecordId(saved.recordId); setPanel(saved.panel); setOverview(Boolean(saved.overview));
      setPointLocation(saved.point);
      setPointBrowserOpen(Boolean(saved.point?.node));
      setPointRequest(null);
      setPhotoHidden(Boolean(saved.photoHidden));
      setPhotoId(saved.photoId ?? null);
      setPhotoOpen(Boolean(saved.photoId));
      const pin = photoPinIfSet(saved.photoId);
      setPhotoRequest(pin ? { coordinates: pin.coordinates } : null);
      pendingPhotoFocus.current = saved.photoId ? 'reveal' : null;
      setLocationReady(true);
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [fullAtlas]);
  useEffect(() => {
    if (!locationReady || window.location.pathname !== '/curb/explore') return;
    const next = explorerLocationUrl(window.location.href, {
      collectionId: collection?.id ?? collectionId, recordId: record?.id ?? recordId, filter, query, panel,
      ...(showOverview ? { overview: true as const } : {}), point: activePoints,
      ...(selectedPhoto ? { photoId: selectedPhoto.id } : {}),
      ...(campusView && photoHidden ? { photoHidden: true as const } : {}),
    });
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      // Replace this page's entry: scrubbing snapshots must not create dozens of Back steps.
      // Next's native-history bridge retains its router state when passed null.
      window.history.replaceState(null, '', next);
    }
  }, [locationReady, collection?.id, record?.id, collectionId, recordId, filter, query, panel, showOverview, activePoints, selectedPhoto, campusView, photoHidden]);
  useEffect(() => {
    if (!locationReady || campusView) return;
    setPointLocation(undefined);
    setPointBrowserOpen(false);
    setPointRequest(null);
    setPhotoId(null);
    setPhotoOpen(false);
    setPhotoRequest(null);
    setPhotoHidden(false);
  }, [locationReady, campusView]);
  const all = collection ? recordsFor(atlas, collection) : [];
  const stops = useMemo(() => collection ? stopNumbers(collection) : new Map<string, number>(), [collection]);
  const counts = collection ? coverage(atlas, collection) : null;
  const paths = useMemo(() => campusPaths(atlas), [atlas]);
  const pad = (n: number | undefined) => String(n ?? 0).padStart(2, '0');
  const group: GroupId | null = showOverview ? 'campus' : collection ? groupOf(collection.id) : null;
  const inCampusSection = !showOverview && isCampus(collection?.id);
  // Details are a collapsible side panel ("map" in the URL = details hidden); a URL may also ask for them.
  const detailsOpen = panel !== 'map' && !showOverview;
  const wayDrawerOpen = detailsOpen && !showPointBrowser && !showPhotoBrowser;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);
  const detailsToggle = useRef<HTMLButtonElement>(null);
  const campusSectionSelect = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => {
    const pending = pendingPointFocus.current;
    if (pending === 'heading') pointHeading.current?.focus();
    if (pending === 'scroll' && window.matchMedia('(max-width: 950px)').matches) pointHeading.current?.scrollIntoView({ block: 'nearest' });
    if (pending === 'way') detailsToggle.current?.focus();
    pendingPointFocus.current = null;
  }, [showPointBrowser]);
  function revealPhoto(behavior: 'focus' | 'reveal') {
    if (behavior === 'focus') photoHeading.current?.focus();
    else if (window.matchMedia('(max-width: 950px)').matches) photoHeading.current?.scrollIntoView({ block: 'nearest' });
  }
  useLayoutEffect(() => {
    const pending = pendingPhotoFocus.current;
    if (!pending || !showPhotoBrowser) return;
    revealPhoto(pending);
    pendingPhotoFocus.current = null;
  }, [showPhotoBrowser, photoId]);

  const dismissPhoto = (returnFocus = false) => {
    setPhotoOpen(false);
    setPhotoId(null);
    setPhotoRequest(null);
    pendingPhotoFocus.current = null;
    if (returnFocus) photoBrowse.current?.focus();
  };
  const openPhoto = () => {
    setPanel('map');
    setPointBrowserOpen(false);
    setPointLocation(previous => previous && { ...previous, node: null });
    setPointRequest(null);
    setPhotoOpen(true);
  };
  const selectPhoto = (id: string, keyboard: boolean, locate = false) => {
    openPhoto();
    const behavior = keyboard ? 'focus' : 'reveal';
    const pin = photoPinIfSet(id);
    setPhotoRequest(locate && pin ? { coordinates: pin.coordinates } : null);
    if (id === photoId && showPhotoBrowser) revealPhoto(behavior);
    else pendingPhotoFocus.current = behavior;
    setPhotoId(id);
  };
  const photoLayer: PhotoLayer | undefined = showPhotos ? {
    records: photoRecords, selectedId: selectedPhoto?.id ?? null, request: photoRequest, onSelect: selectPhoto,
  } : undefined;
  const selectPoint = (point: CampusPoint | null) => {
    if (point && showPhotoBrowser) dismissPhoto();
    setPointLocation(previous => previous && { ...previous, node: point?.sourceFeatureId ?? null });
    setPointRequest(null);
    if (point) setPointBrowserOpen(true);
  };
  const closePointBrowser = (keyboard: boolean) => {
    setPointBrowserOpen(false);
    selectPoint(null);
    if (keyboard || document.activeElement?.closest('#campus-point-browser')) {
      browseButton.current?.focus({ preventScroll: !keyboard });
    }
  };
  const pointLayer: CampusPointLayer | undefined = inventory ? {
    records: inventory.results, selected: selectedPoint, request: pointRequest, onSelect: selectPoint,
  } : undefined;
  const selectRecord = (id: string) => {
    if (collection) setCollectionId(collection.id);
    if (showPointBrowser) closePointBrowser(false);
    if (showPhotoBrowser) dismissPhoto();
    setRecordId(id);
    setOverview(false);
    setPanel(previous => previous === 'map' ? 'evidence' : previous);
  };
  const chooseCollection = (c: Collection) => {
    setPointRequest(null);
    setPhotoRequest(null);
    setCollectionId(c.id);
    setRecordId(c.recordIds[0]);
    setOverview(false);
  };
  const pickSection = (id: string) => { const c = atlas.collections.find(x => x.id === id); if (c) chooseCollection(c); };
  const focusCampusPicker = () => {
    const keyboardFocus = document.activeElement?.matches(':focus-visible');
    campusSectionSelect.current?.focus({ preventScroll: !keyboardFocus });
  };
  const pickFromOverview = (id: string) => {
    // The selector survives the view change. Move focus before the active map target disappears.
    if (document.activeElement?.closest('[data-overview="true"]')) focusCampusPicker();
    pickSection(id);
  };
  const returnToOverview = (focusPicker: boolean) => {
    if (focusPicker) focusCampusPicker();
    setQuery('');
    setOverview(true);
    setPanel('map');
    setPhotoRequest(null);
    setPointRequest(null);
    setPointLocation(previous => previous?.scope === 'section' ? { ...previous, scope: 'all' } : previous);
  };
  const chooseGroup = (g: GroupId) => {
    const options = collectionsIn(g, collections);
    if (g === 'campus' && !query.trim()) { returnToOverview(false); return; }
    if (g === 'campus') setPanel('map');
    const keep = collection && groupOf(collection.id) === g && !showOverview ? collection : options[0];
    if (keep) chooseCollection(keep);
  };
  const clear = () => { setFilter('all'); setQuery(''); };
  const index = record ? records.findIndex(r => r.id === record.id) : -1;
  const step = (offset: number) => { if (records.length) selectRecord(records[(index + offset + records.length) % records.length].id); };
  const feature = record ? atlas.features.find(f => f.id === record.featureId) : undefined;
  const sourceTags = feature && isCampus(collection?.id) ? campusSourceTags(feature.properties) : [];
  const chip = feature ? feature.geometry ? feature.properties.status ? `${sourceClass(feature.properties, feature.type)} · ${feature.properties.status}` : sourceClass(feature.properties, feature.type) : 'Not on map' : '';
  useEffect(() => { if (filtered) setFiltersOpen(true); }, [filtered]);
  // A deep link that asks for the evidence opens the details; on phones, bring them into view once.
  useEffect(() => {
    if (!locationReady || panel !== 'evidence' || showPointBrowser || showPhotoBrowser || window.matchMedia('(min-width: 951px)').matches) return;
    detailsRef.current?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationReady]);
  const fmt = (n: number) => n.toLocaleString('en-US');
  const view = campusView ? 'campus' : collection?.kind === 'field' ? 'field' : 'downtown';
  const railOpen = wayDrawerOpen || showPointBrowser || showPhotoBrowser;
  return <div className={styles.explorer} data-view={view} data-rail={railOpen ? 'open' : 'closed'}>
    <header className={styles.heading}>
      <h1>Route explorer<span className={styles.headingDot}>.</span></h1>
      <nav className={styles.pageLinks} aria-label="Related pages"><a href="/curb/collection">How collection would work →</a><a href="/curb/surveys/robertson-hall">Review Robertson survey →</a></nav>
    </header>
    <div className={styles.switcher}>
      <GroupChips visible={collections} current={group} onGroup={chooseGroup} />
      <button type="button" className={styles.filterToggle} aria-expanded={filtersOpen} aria-controls="explorer-filters"
        onClick={() => setFiltersOpen(open => !open)}>Filter{filtered ? ' · on' : ''}<span aria-hidden="true">▾</span></button>
      <div id="explorer-filters" className={styles.toolbar} hidden={!filtersOpen}>
        <label className={styles.search}><span aria-hidden="true">⌕</span><span className={styles.srOnly}>Search collections, features or source IDs, such as way/1342265659</span><input value={query} onChange={e => setQuery(e.target.value)} maxLength={256} placeholder="Collection, place or source ID (way/…)" type="search" /></label>
        <label className={styles.filter}>Evidence type<select value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">All evidence</option><option value="archive">{kindLabels.archive}</option><option value="field">{kindLabels.field}</option></select></label>
        <span className={styles.resultCount}>{collections.length} of {atlas.collections.length} collections</span>
        {filtered && <button type="button" className={styles.clear} onClick={clear}>Clear filters</button>}
      </div>
    </div>
    {group === 'downtown' && <CollectionChips atlas={atlas} collections={collectionsIn('downtown', collections)} selectedId={collection?.id ?? null} onSelect={chooseCollection} />}
    {campusView && <div className={styles.campusControls}>
      <SectionPicker sections={campusSections} collections={collections} current={showOverview ? null : collection?.id ?? null}
      onPick={pickSection} clearsSearch={Boolean(query.trim())} onOverview={() => returnToOverview(true)} selectRef={campusSectionSelect} />
    {locationReady && <div className={styles.pointControls} aria-label="Campus archive feature layer" role="group">
      <button type="button" aria-pressed={Boolean(activePoints)} onClick={() => {
        setPointLocation(activePoints ? undefined : DEFAULT_POINT_LOCATION);
        setPointRequest(null);
        setPointBrowserOpen(false);
      }}>Show archive features</button>
      {activePoints && inventory && <>
        <button type="button" ref={browseButton} aria-expanded={showPointBrowser} aria-controls={showPointBrowser ? 'campus-point-browser' : undefined}
          onClick={event => {
            const keyboard = event.detail === 0;
            if (showPointBrowser) {
              if (keyboard) pointHeading.current?.focus();
              else if (window.matchMedia('(max-width: 950px)').matches) pointHeading.current?.scrollIntoView({ block: 'nearest' });
              return;
            }
            if (showPhotoBrowser) dismissPhoto();
            pendingPointFocus.current = keyboard ? 'heading' : 'scroll';
            setPointBrowserOpen(true);
          }}>Browse features</button>
        <span>{inventory.counts.total} archive features</span>
        <CampusPointLegend />
      </>}
    </div>}
    {locationReady && photoRecords.length > 0 && <div className={photoStyles.controls} role="group" aria-label="Campus photo evidence layer">
      <button type="button" aria-pressed={showPhotos} onClick={() => {
        if (showPhotos) dismissPhoto();
        setPhotoHidden(showPhotos);
      }}>Photo evidence</button>
      {showPhotos && <>
        <button type="button" ref={photoBrowse} aria-expanded={showPhotoBrowser}
          aria-controls={showPhotoBrowser ? 'campus-photo-browser' : undefined}
          onClick={event => {
            const behavior = event.detail === 0 ? 'focus' : 'reveal';
            if (showPhotoBrowser) revealPhoto(behavior);
            else {
              pendingPhotoFocus.current = behavior;
              openPhoto();
            }
          }}>Browse photos</button>
        {photoKinds.length > 0 && <PhotoLegend kinds={photoKinds} />}
      </>}
    </div>}
    </div>}
    <div className={styles.workspace} data-view={view} data-details={railOpen ? 'open' : 'closed'}>
      <section id="explorer-map" className={styles.mapPanel} aria-label="Evidence stage">
        {/* Wait for the URL so a campus link never first requests the downtown image. */}
        {!locationReady ? <div className={styles.stage} data-mode="loading" /> : showOverview ? <>
          <div className={styles.mapHeading}>
            <h2>Princeton campus</h2>
            <span className={styles.coverage}><b>{fmt(campusCounts.selectedWays)}</b> ways · <b>{campusCounts.sections}</b> sections</span>
            <span className={styles.traversal}>Current traversal: Unknown</span>
          </div>
          <div className={styles.stage} data-mode="overview">
            <OverviewMap paths={paths} sections={campusSections} collections={collections} onPick={pickFromOverview} pointLayer={pointLayer} photoLayer={photoLayer} />
          </div>
        </> : <>
          <div className={styles.mapHeading}>
            <h2>{collection?.name ?? 'No matching evidence'}</h2>
            {counts && <span className={styles.coverage}><b>{counts.records}</b> {inCampusSection ? 'ways' : 'records'} · <b>{counts.mappedRecords}</b> on map · <b>{counts.unplacedRecords}</b> not on map{counts.conflictRecords > 0 && <> · <b>{counts.conflictRecords}</b> in conflict</>}
              {records.length < all.length && <> · {records.length} match <button type="button" onClick={clear}>Show all</button></>}</span>}
            <span className={styles.traversal}>{collection ? traversalText(collection) : 'Current traversal: Unknown'}</span>
          </div>
          <EvidenceStage atlas={atlas} collection={collection} records={records} record={record} stops={stops} onSelect={selectRecord} onReset={clear}
            mapOptions={inCampusSection ? { set: 'campus', context: paths.all, section: campusSections.find(section => section.collectionId === collection?.id), osm: true, dense: true, pointLayer, photoLayer } : undefined} />
          {collection && record && <div className={styles.navigator} role="group" aria-label="Selected record">
            <button type="button" aria-label="Previous snapshot" onClick={() => step(-1)}>‹</button>
            <div className={styles.navCurrent} aria-live="off">
              <b>#{pad(stops.get(record.id))}</b>
              <span className={styles.navTitle}>{record.title}</span>
              <span className={styles.navMeta}>{chip} · {record.kind === 'archive' ? 'Source capture' : 'Photo captured'}: {dateText(record.captured)}</span>
            </div>
            <span className={styles.navCount}>{index + 1} / {records.length}</span>
            <button type="button" aria-label="Next snapshot" onClick={() => step(1)}>›</button>
            <button type="button" ref={detailsToggle} className={styles.detailsToggle} aria-expanded={wayDrawerOpen} aria-controls="explorer-evidence"
              onClick={() => {
                if (showPointBrowser) closePointBrowser(false);
                if (showPhotoBrowser) dismissPhoto();
                setPanel(wayDrawerOpen ? 'map' : 'evidence');
              }}>{wayDrawerOpen ? 'Hide details' : 'Show details'}</button>
          </div>}
        </>}
      </section>
      <aside id="explorer-evidence" ref={detailsRef} className={styles.drawer} aria-label="Selected evidence" data-open={wayDrawerOpen}>
        <div className={styles.drawerHeading}><h2>Evidence detail</h2>
          <button type="button" className={styles.drawerClose} onClick={() => {
          setPanel('map');
          detailsToggle.current?.focus();
        }} aria-label="Hide details">×</button></div>
        {record ? <>
          <RecordCard key={record.id} atlas={atlas} record={record} stop={stops.get(record.id)} hidePhoto={collection?.kind !== 'synthetic'} />
          {sourceTags.length > 0 && <details key={record.id + ':tags'} className={styles.campusSourceTags}>
            <summary>All OpenStreetMap tags</summary>
            <dl>{sourceTags.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
          </details>}
        </> : <div className={styles.empty}><h3>No matching evidence</h3><p>Unplaced evidence remains in its source collection.</p><button type="button" onClick={clear}>Show the complete atlas</button></div>}
        {record && <details className={styles.allRecords}><summary>All {all.length} records in source order</summary>{all.map(r => <button type="button" key={r.id} aria-current={r.id === record.id || undefined} onClick={() => { clear(); selectRecord(r.id); }}><span>#{pad(stops.get(r.id))} {r.title}</span><small>{r.id}{!atlas.features.find(f => f.id === r.featureId)?.geometry && ' · Not on map'}</small></button>)}</details>}
      </aside>
      {showPointBrowser && activePoints && inventory && <CampusPointBrowser
        location={activePoints} section={pointSection} records={inventory.results} counts={inventory.counts}
        memberships={inventory.memberships} selected={selectedPoint} headingRef={pointHeading} wayDetailsOpen={detailsOpen}
        onChange={next => setPointLocation(previous => previous && { ...previous, ...next })}
        onSelect={selectPoint} onClose={closePointBrowser}
        onShowOnMap={(point, focusMap) => {
          if (point.geometry) setPointRequest({ coordinates: point.geometry.coordinates, focusMap });
        }}
        onWayDetails={keyboard => {
          if (keyboard) pendingPointFocus.current = 'way';
          closePointBrowser(false);
        }} />}
      {showPhotoBrowser && <PhotoEvidenceBrowser records={photoRecords} selected={selectedPhoto} headingRef={photoHeading}
        onSelect={(id, keyboard) => selectPhoto(id, keyboard, true)} onClose={() => dismissPhoto(true)}
        onLocate={focusMap => {
          const pin = selectedPhoto && photoPin(selectedPhoto);
          if (pin) setPhotoRequest({ coordinates: pin.coordinates, focusMap });
        }} />}
    </div>
    <footer className={styles.attribution}>
      <span>Archive geometry © Delaware Valley Regional Planning Commission (DVRPC). <a href="https://catalog.dvrpc.org/dvrpc_data_license.html" target="_blank" rel="noreferrer">Data terms →</a></span>
      <span>Campus ways: <OsmCredit /> (snapshot retrieved {campusRetrievedAt.slice(0, 10)}).</span>
      <span>{aerial.attribution} Exact capture date unknown; context only.</span>
      <span>Local catalog · no live updates</span>
    </footer>
    <p className={styles.srOnly} role="status" aria-live="polite">{showOverview ? `Princeton campus overview: ${campusCounts.selectedWays} OpenStreetMap ways in ${campusCounts.sections} sections. Current traversal unknown.`
      : collection ? `${collection.name}, ${records.length} matching records. ${record ? `Record ${stops.get(record.id)}: ${record.title}` : ''}. Current traversal unknown. ${counts?.unplacedRecords ?? 0} records not on the map in this collection.` : 'No matching evidence. Show the complete atlas to restore all collections.'}</p>
  </div>;
}
