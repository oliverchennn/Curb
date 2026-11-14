import type { TripRouteResult, TripScenario } from '../../../contracts/curb/trips';
import { edgeName, formatDistance, nodeName, projectedAssessment } from './presentation';
import { TripDiagram } from './TripDiagram';
import styles from './TripPlanner.module.css';

const STATUS_LABELS = { reachable: 'Reachable', blocked: 'Blocked', unknown: 'Unknown', disconnected: 'Disconnected' };

export function TripResult({ context, result, repairId, title, onSelectBarrier }: {
  context: TripScenario;
  result: TripRouteResult;
  repairId: string | null;
  title: string;
  onSelectBarrier: (barrierId: string) => void;
}) {
  const explanations = result.status === 'reachable' ? [] : [
    ...result.blockedEdgeIds.map((id) => ({ id, status: 'Blocked' })),
    ...result.unknownEdgeIds.map((id) => ({ id, status: 'Unknown' })),
  ];

  return <section className={styles.resultCard} aria-label={title}>
    <div className={styles.resultHeading}>
      <h3>{title}</h3>
      <span className={styles[result.status]}>{STATUS_LABELS[result.status]}</span>
    </div>
    {result.status === 'reachable' ? <>
      <p className={styles.distance}>{formatDistance(result.distanceMeters)}<span>route length</span></p>
      {result.edgeIds.length === 0 ? <p>You are already at this destination. No edges are needed.</p> : null}
      <p className={styles.path}>{result.nodeIds.map((id) => nodeName(context, id)).join(' → ')}</p>
      {result.edgeIds.length > 0 ? <ol className={styles.edgeList} aria-label={`${title} route connections`}>
        {result.edgeIds.map((id, index) => {
          const edge = context.scenario.edges.find((item) => item.id === id);
          const assessment = context.edgeAssessments.find((item) => item.edgeId === id);
          return edge ? <li key={id}>
            <strong>{nodeName(context, result.nodeIds[index])} → {nodeName(context, result.nodeIds[index + 1])}</strong>
            <span className={styles.small}>{assessment?.kind ?? 'Connection'} · {formatDistance(edge.lengthMeters)}</span>
          </li> : null;
        })}
      </ol> : null}
    </> : <>
      <p className={styles.noRoute}>No route returned</p>
      <p>{result.status === 'disconnected'
        ? 'The authored network has no directed connection from this origin to this destination.'
        : result.status === 'unknown'
          ? 'A possible connection needs unknown assessments. Unknown edges are excluded from routing.'
          : 'A possible connection includes known blockers. It cannot be used under this profile.'}</p>
      {explanations.length > 0 ? <>
        <p className={styles.small}>These reasons describe one possible directed connection, not every alternative.</p>
        <ul className={styles.explanations}>{explanations.map(({ id, status }) => {
          const edge = context.scenario.edges.find((item) => item.id === id);
          const assessment = projectedAssessment(context, id, repairId);
          return <li key={id}>
            <strong>{edge ? edgeName(context, edge) : id}</strong>
            <span className={styles.small}>{status} · {assessment?.kind ?? 'Connection'}</span>
            <p>{assessment?.reason ?? 'No authored reason is available.'}</p>
            {assessment?.status === 'unknown' && status === 'Blocked'
              ? <p className={styles.small}>Unknown coverage also remains on this connection.</p> : null}
            {assessment?.blockingBarrierIds.map((barrierId) => <button type="button" key={barrierId}
              className={styles.evidenceButton} onClick={() => onSelectBarrier(barrierId)}>
              View evidence: {context.scenario.barriers.find((barrier) => barrier.id === barrierId)?.note || barrierId}
            </button>)}
          </li>;
        })}</ul>
      </> : null}
    </>}
    <TripDiagram context={context} result={result} repairId={repairId} title={`${title} network schematic`} />
  </section>;
}
