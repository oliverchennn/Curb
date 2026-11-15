'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { CATEGORY_LABELS, POINT_CATEGORIES, type CampusPoint, type CampusPointCounts } from '../../../data/curb/princeton-campus-points/adapter';
import { campusSections } from './groups';
import type { CampusPointLocation, PointScope } from './location';
import styles from './Explorer.module.css';

const PAGE_SIZE = 12;
const SCOPE_LABELS: Record<PointScope, string> = {
  all: 'All features', section: 'Linked to this section', context: 'Perimeter context',
  unlinked: 'No selected-way link', review: 'Location review needed',
};

function PointLabels({ point }: { point: CampusPoint }) {
  return <span className={styles.pointLabels}>
    {point.categories.map(category => CATEGORY_LABELS[category]).join(' · ')}
    {point.boundaryStatus === 'retained-way-context' && ' · Perimeter context'}
    {point.selectedWayIds.length === 0 && ' · No selected-way link'}
    {point.locationStatus === 'location-review-needed' && ' · Location review needed'}
  </span>;
}

function SourceTime({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{value.replace('T', ' ').replace(/Z$/, ' UTC')}</time> : <>Unknown</>;
}

export default function CampusPointBrowser({
  location, section, records, counts, memberships, selected, headingRef, wayDetailsOpen,
  onChange, onSelect, onShowOnMap, onClose, onWayDetails,
}: {
  location: CampusPointLocation;
  section: string | null;
  records: readonly CampusPoint[];
  counts: CampusPointCounts;
  memberships: CampusPointCounts['categoryMemberships'];
  selected: CampusPoint | null;
  headingRef: Ref<HTMLHeadingElement>;
  wayDetailsOpen: boolean;
  onChange: (filter: Pick<CampusPointLocation, 'query' | 'categories' | 'scope'>) => void;
  onSelect: (point: CampusPoint | null) => void;
  onShowOnMap: (point: CampusPoint, keyboard: boolean) => void;
  onClose: (keyboard: boolean) => void;
  onWayDetails: (keyboard: boolean) => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const page = Math.min(pageIndex, pageCount - 1);
  const rows = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const currentRow = rows.find(point => point.sourceFeatureId === activeRow) ?? rows[0];
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<'detail' | 'list' | 'first' | null>(null);
  const keepScroll = useRef(false);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === 'detail') detailHeading.current?.focus();
    if (target === 'list' || target === 'first') {
      const id = target === 'list' ? activeRow : rows[0]?.sourceFeatureId;
      const row = id ? rowRefs.current.get(id) : null;
      (row ?? listHeading.current)?.focus({ preventScroll: keepScroll.current });
      keepScroll.current = false;
    }
  });

  const change = (filter: Pick<CampusPointLocation, 'query' | 'categories' | 'scope'>) => {
    setPageIndex(0);
    setActiveRow(null);
    onChange(filter);
  };

  const openDetails = (point: CampusPoint, keyboard: boolean) => {
    setActiveRow(point.sourceFeatureId);
    if (keyboard) pendingFocus.current = 'detail';
    onSelect(point);
  };

  const closeDetails = (keyboard: boolean) => {
    pendingFocus.current = 'list';
    keepScroll.current = !keyboard;
    onSelect(null);
  };

  const onRowKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const next = key === 'Home' ? 0 : key === 'End' ? rows.length - 1
      : (index + (key === 'ArrowUp' ? -1 : 1) + rows.length) % rows.length;
    rowRefs.current.get(rows[next].sourceFeatureId)?.focus();
  };

  const stepPage = (step: number, keyboard: boolean) => {
    if (keyboard) pendingFocus.current = 'first';
    setActiveRow(null);
    setPageIndex(page + step);
  };

  return <aside id="campus-point-browser" aria-labelledby="campus-point-heading" className={styles.pointBrowser}
    onKeyDown={event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (selected) closeDetails(true);
      else onClose(true);
    }}>
    <header className={styles.pointBrowserHeader}>
      <h2 id="campus-point-heading" ref={headingRef} tabIndex={-1}>Archive features</h2>
      <button type="button" onClick={event => onClose(event.detail === 0)}>Close browser</button>
    </header>
    <div className={styles.pointBrowserBody}>
      {wayDetailsOpen && <button type="button" onClick={event => onWayDetails(event.detail === 0)}>Back to way details</button>}
      <p data-point-results role="status">
        <strong>{counts.total} unique {counts.total === 1 ? 'result' : 'results'}</strong> · {counts.mapEligible} eligible positions · {counts.locationReviewNeeded} need location review
      </p>
      <p className={styles.pointLabels}>{counts.context} perimeter context · {counts.unlinked} no selected-way link</p>
      {selected ? <>
        <button type="button" onClick={event => closeDetails(event.detail === 0)}>Back to feature list</button>
        <section aria-labelledby="campus-point-detail">
          <h3 id="campus-point-detail" ref={detailHeading} tabIndex={-1}>{selected.label}</h3>
          <PointLabels point={selected} />
          <p>OpenStreetMap archive · exact source node</p>
          {!records.some(point => point.sourceFeatureId === selected.sourceFeatureId) && <p>Selected feature is outside the current filters.</p>}
          {selected.boundaryStatus === 'retained-way-context' && <p>Perimeter context · outside the selected campus boundary.</p>}
          {section && !selected.sectionCollectionIds.includes(section) && <p>Not linked to this section in the source.</p>}
          {selected.locationReviewNote && <p>Location review needed. Source note: {selected.locationReviewNote}.</p>}
          {selected.geometry && <button type="button" onClick={event => onShowOnMap(selected, event.detail === 0)}>Show on map</button>}
          <dl className={styles.pointFacts}>
            <dt>Source node</dt>
            <dd><a href={'https://www.openstreetmap.org/node/' + selected.sourceNode.id} target="_blank" rel="noreferrer">{selected.sourceFeatureId}</a></dd>
            <dt>Source version</dt><dd>{selected.sourceNode.version}</dd>
            <dt>Source edit</dt><dd><SourceTime value={selected.sourceNode.timestamp} /></dd>
            <dt>Retrieved</dt>
            <dd>
              <SourceTime value={selected.retrieval.earliestKnownAt} />
              {selected.retrieval.latestKnownAt !== selected.retrieval.earliestKnownAt && <> to <SourceTime value={selected.retrieval.latestKnownAt} /></>}
              {selected.retrieval.hasResponseWithUnknownRetrievalTime && <> · some source receipts undated</>}
            </dd>
            <dt>Observed</dt><dd>Unknown</dd>
            <dt>Captured</dt><dd>Unknown</dd>
            <dt>Selected way joins</dt><dd>{selected.selectedWayIds.map(id => 'way/' + id).join(', ') || 'No selected-way link'}</dd>
            <dt>Source section joins</dt>
            <dd>{selected.sectionCollectionIds.map(id => campusSections.find(s => s.collectionId === id)?.code ?? id).join(', ') || 'None'}</dd>
          </dl>
          <p className={styles.traversal}>Current traversal: Unknown</p>
          <details>
            <summary>Source tags</summary>
            <dl className={styles.pointFacts}>{Object.entries(selected.sourceNode.tags).map(([key, value]) => (
              <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
            ))}</dl>
          </details>
        </section>
      </> : <>
        <details className={styles.pointFilters} open={filtersOpen} onToggle={event => setFiltersOpen(event.currentTarget.open)}>
          <summary>Feature filters</summary>
          <label className={styles.pointSearch}>Search archive features
            <input ref={searchField} type="search" value={location.query} maxLength={256} placeholder="Name, category or node/ID"
              onChange={event => change({ ...location, query: event.target.value })} />
          </label>
          <fieldset>
            <legend>Category memberships</legend>
            {POINT_CATEGORIES.map(category => <label key={category}>
              <input type="checkbox" checked={location.categories.includes(category)}
                onChange={event => change({ ...location, categories: event.target.checked
                  ? [...location.categories, category] : location.categories.filter(item => item !== category) })} />
              {CATEGORY_LABELS[category]} ({memberships[category]})
            </label>)}
          </fieldset>
          <label className={styles.pointSearch}>Feature scope
            <select value={location.scope} onChange={event => change({ ...location, scope: event.target.value as PointScope })}>
              {(Object.keys(SCOPE_LABELS) as PointScope[]).filter(scope => scope !== 'section' || section).map(scope => (
                <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>
              ))}
            </select>
          </label>
          {(location.query || location.categories.length > 0 || location.scope !== 'all') &&
            <button type="button" onClick={event => {
              searchField.current?.focus({ preventScroll: event.detail !== 0 });
              change({ query: '', categories: [], scope: 'all' });
            }}>Clear feature filters</button>}
        </details>
        <h3 ref={listHeading} tabIndex={-1}>Feature results</h3>
        {rows.length ? <>
          <ul className={styles.pointRows} aria-label="Feature results">
            {rows.map((point, index) => <li key={point.sourceFeatureId}>
              <button type="button" data-point-row={point.sourceFeatureId}
                ref={element => {
                  if (element) rowRefs.current.set(point.sourceFeatureId, element);
                  else rowRefs.current.delete(point.sourceFeatureId);
                }}
                tabIndex={currentRow?.sourceFeatureId === point.sourceFeatureId ? 0 : -1}
                onFocus={() => setActiveRow(point.sourceFeatureId)} onKeyDown={event => onRowKey(event, index)}
                onClick={event => openDetails(point, event.detail === 0)}>
                <strong>{point.label}</strong>
                <PointLabels point={point} />
              </button>
            </li>)}
          </ul>
          <nav className={styles.pointPager} aria-label="Feature result pages">
            <button type="button" disabled={page === 0} onClick={event => stepPage(-1, event.detail === 0)}>Previous</button>
            <span>Page {page + 1} of {pageCount}</span>
            <button type="button" disabled={page + 1 >= pageCount} onClick={event => stepPage(1, event.detail === 0)}>Next</button>
          </nav>
        </> : <p>No archive features match these filters.</p>}
      </>}
    </div>
  </aside>;
}
