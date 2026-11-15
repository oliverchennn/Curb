import { useId, type CSSProperties } from 'react';
import type { PlanScenario } from '../../../contracts/curb/plans';
import { destinationLabel, nodeLabel, ROUTE_STATUS_LABELS } from '../plans/presentation';
import { money, reachableEdgeIds, shortRepairLabel, type InvestmentProjection } from './presentation';
import styles from './InvestmentDemo.module.css';

// Display coordinates only. Connectivity and every highlighted path come from
// the scenario and returned route witnesses; this component does no routing.
const NODES = [
  { id: 'arrival', x: 12, y: 36, kind: 'origin' },
  { id: 'link-mid', x: 40, y: 36, kind: 'junction' },
  { id: 'hub', x: 65, y: 36, kind: 'junction' },
  { id: 'library-door', x: 87, y: 13, kind: 'destination', destinationId: 'library' },
  { id: 'student-center-door', x: 87, y: 59, kind: 'destination', destinationId: 'student-center' },
  { id: 'hall-door', x: 50, y: 84, kind: 'destination', destinationId: 'hall' },
  { id: 'cafe-door', x: 12, y: 84, kind: 'destination', destinationId: 'cafe' },
] as const;

const EDGES = [
  { id: 'link-a', points: '12,36 40,36' },
  { id: 'link-b', points: '40,36 65,36' },
  { id: 'library-walk', points: '65,36 73,36 73,13 87,13' },
  { id: 'student-center-walk', points: '65,36 73,36 73,59 87,59' },
  { id: 'hall-link', points: '12,36 50,84' },
  { id: 'cafe-walk', points: '12,36 12,84' },
] as const;

const REPAIR_MARKERS = [
  { id: 'repair-a', x: 26, y: 36 },
  { id: 'repair-b', x: 52.5, y: 36 },
  { id: 'repair-c', x: 31, y: 60 },
] as const;

const position = (x: number, y: number): CSSProperties => ({ left: `${x}%`, top: `${y}%` });

export function InvestmentDiagram({ scenario, projection, selectedRepairId, onSelectRepair }: {
  scenario: PlanScenario;
  projection: InvestmentProjection | null;
  selectedRepairId: string | null;
  onSelectRepair: (id: string | null) => void;
}) {
  const descriptionId = useId();
  const highlighted = projection ? reachableEdgeIds(projection.coverage) : new Set<string>();
  const selected = new Set(projection?.selectedRepairIds ?? []);
  const clearedBarriers = new Set(scenario.repairs.filter(({ id }) => selected.has(id)).map(({ barrierId }) => barrierId));

  return <figure className={styles.diagram} aria-describedby={descriptionId}>
    <div className={styles.diagramCanvas}>
      <svg className={styles.diagramPaths} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {EDGES.filter(({ id }) => scenario.scenario.edges.some((edge) => edge.id === id)).map(({ id, points }) => {
          const blocked = scenario.edgeAssessments.find(({ edgeId }) => edgeId === id)?.blockingBarrierIds
            .some((barrierId) => !clearedBarriers.has(barrierId)) ?? false;
          return <polyline key={id} points={points} fill="none" vectorEffect="non-scaling-stroke"
            className={`${styles.diagramEdge} ${highlighted.has(id) ? styles.diagramReachable : blocked ? styles.diagramBlocked : ''}`}
            data-edge-id={id} data-reachable={highlighted.has(id)} />;
        })}
      </svg>

      {NODES.filter(({ id }) => scenario.scenario.nodes.some((node) => node.id === id)).map((node) => {
        const destinationId = 'destinationId' in node ? node.destinationId : null;
        const outcome = projection?.coverage.outcomes.find((item) => item.destinationId === destinationId);
        const reachable = outcome?.route.status === 'reachable';
        const newlyReachable = destinationId !== null && projection?.restoredDestinationIds.includes(destinationId);
        const label = destinationId ? destinationLabel(scenario, destinationId) : nodeLabel(scenario, node.id);
        const status = outcome ? reachable ? newlyReachable ? 'Newly reachable' : 'Baseline access' : ROUTE_STATUS_LABELS[outcome.route.status] : 'Awaiting comparison';
        return <div key={node.id} style={position(node.x, node.y)}
          className={`${styles.diagramNode} ${node.kind === 'origin' ? styles.originNode : node.kind === 'junction' ? styles.junctionNode : styles.destinationNode} ${reachable ? styles.reachableNode : ''}`}
          data-node-id={node.id}>
          <span className={styles.nodeSymbol} aria-hidden="true">{node.kind === 'origin' ? '↗' : node.kind === 'junction' ? '' : reachable ? '✓' : outcome ? '×' : '·'}</span>
          <span className={styles.nodeLabel}>{label}</span>
          {node.kind === 'origin' ? <span className={styles.nodeStatus}>Start here</span> : destinationId ? <span className={styles.nodeStatus}>{status}</span> : null}
        </div>;
      })}

      {REPAIR_MARKERS.map(({ id, x, y }) => {
        const repair = scenario.repairs.find((item) => item.id === id);
        if (!repair) return null;
        const cost = scenario.candidates.find((candidate) => candidate.repairId === id)?.cost;
        const funded = selected.has(id);
        const costText = cost && cost.status !== 'unknown' ? money(cost.cents) : 'Cost unknown';
        return <div key={id} className={styles.repairMarker} style={position(x, y)}>
          <button id={`investment-repair-${id}`} type="button" className={`${styles.repairButton} ${funded ? styles.fundedRepair : ''}`}
            aria-pressed={selectedRepairId === id}
            aria-label={`Inspect repair ${shortRepairLabel(id)}: ${repair.label}. ${costText}. ${projection ? funded ? 'Included in displayed plan.' : 'Not included in displayed plan.' : 'Awaiting comparison.'}`}
            onClick={() => onSelectRepair(selectedRepairId === id ? null : id)}>
            <span aria-hidden="true" className={styles.repairSymbol}>{funded ? '✓' : '×'}</span>
            {shortRepairLabel(id)}
          </button>
          <span className={styles.repairCost}>{costText}</span>
        </div>;
      })}
    </div>

    <figcaption>
      <div className={styles.diagramLegend} aria-label="Schematic legend">
        <span><i className={styles.legendReachable} aria-hidden="true" />Returned reachable route</span>
        <span><i className={styles.legendBlocked} aria-hidden="true" />Remaining barrier</span>
        <span><b aria-hidden="true">✓</b> Funded repair</span>
      </div>
      <p id={descriptionId} className={styles.diagramCaption}>Schematic, not to scale. A and B share the approach to Library and Student center. Select a repair to inspect its assumptions.</p>
      <details className={styles.routeDetails}>
        <summary>Route outcomes in text</summary>
        {projection ? <ul>{projection.coverage.outcomes.map(({ destinationId, route }) => <li key={destinationId}>
          <strong>{destinationLabel(scenario, destinationId)}</strong>: {ROUTE_STATUS_LABELS[route.status]}.
          {route.status === 'reachable' ? <> {projection.restoredDestinationIds.includes(destinationId) ? 'Newly reachable. ' : 'Already reachable before repairs. '}
            Path: {route.nodeIds.map((id) => nodeLabel(scenario, id)).join(' → ')}.</> : null}
        </li>)}</ul> : <p>No completed comparison is displayed. Compare plans to load route outcomes.</p>}
      </details>
    </figcaption>
  </figure>;
}
