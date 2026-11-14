'use client';

import { useMemo } from 'react';
import type { Scenario } from '../../../contracts/curb';
import { GeoMap } from '../../../../modules/maps/src/components';
import type { FeatureCollection } from '../../../../modules/maps/src/index';
import { barrierKindLabel, describeEdge, nodeLabeler } from '../screen/labels';
import styles from './CurbMap.module.css';

/** GeoMap's FeatureCollection limit. */
const MAX_FEATURES = 2000;

function toFeatureCollection(scenario: Scenario): FeatureCollection {
  const labelFor = nodeLabeler(scenario);
  const coordinates = new Map(scenario.nodes.map((node) => [node.id, node.coordinate]));
  const features: FeatureCollection['features'] = [];

  for (const edge of scenario.edges) {
    const name = `${labelFor(edge.fromNodeId)} → ${labelFor(edge.toNodeId)}${edge.barrierIds.length ? ' · barrier' : ''}`;
    features.push({
      type: 'Feature',
      id: `edge:${edge.id}`,
      geometry: { type: 'LineString', coordinates: edge.geometry.coordinates },
      properties: { name },
    });
  }

  for (const destination of scenario.destinations) {
    const coordinate = coordinates.get(destination.nodeId);
    if (!coordinate) continue;
    features.push({
      type: 'Feature',
      id: `destination:${destination.id}`,
      geometry: { type: 'Point', coordinates: coordinate },
      properties: { name: destination.label },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function CurbMap({ scenario, selectedBarrierId }: { scenario: Scenario; selectedBarrierId: string | null }) {
  const data = useMemo(() => toFeatureCollection(scenario), [scenario]);

  const selectedText = useMemo(() => {
    if (!selectedBarrierId) return 'No barrier selected.';
    const barrier = scenario.barriers.find((candidate) => candidate.id === selectedBarrierId);
    if (!barrier) return 'No barrier selected.';
    const edge = scenario.edges.find((candidate) => candidate.id === barrier.edgeId);
    return `Selected: ${barrierKindLabel(barrier.kind)} on ${describeEdge(edge, barrier.edgeId, nodeLabeler(scenario))}`;
  }, [scenario, selectedBarrierId]);

  const synthetic = scenario.dataKind === 'synthetic';

  return (
    <div className={styles.map}>
      {data.features.length > MAX_FEATURES ? (
        <p className={styles.note}>
          This scenario has more than {MAX_FEATURES} map features, so the schematic is not drawn. Use the barrier list.
        </p>
      ) : (
        <GeoMap
          data={data}
          mode={synthetic ? 'fixture' : 'local'}
          attribution={synthetic ? 'Synthetic schematic · no basemap requested' : 'Field schematic · no basemap requested'}
        />
      )}
      <p className={styles.selection} aria-live="polite">
        {selectedText}
      </p>
      <p className={styles.note}>
        Lines are paths and dots are destinations. The map does not highlight selections; use the barrier list.
      </p>
    </div>
  );
}
