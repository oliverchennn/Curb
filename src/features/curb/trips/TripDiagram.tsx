import { useId } from 'react';
import type { TripRouteResult, TripScenario } from '../../../contracts/curb/trips';
import { nodeName, projectedAssessment } from './presentation';
import styles from './TripPlanner.module.css';

export function TripDiagram({ context, result, repairId, title }: {
  context: TripScenario;
  result: TripRouteResult;
  repairId: string | null;
  title: string;
}) {
  const id = useId().replace(/:/g, '');
  const { nodes, edges } = context.scenario;
  const coordinates = [...nodes.map((node) => node.coordinate), ...edges.flatMap((edge) => edge.geometry.coordinates)];
  if (coordinates.length === 0) return null;
  const xs = coordinates.map(([x]) => x);
  const ys = coordinates.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1;
  const spanY = Math.max(...ys) - minY || 1;
  const point = ([x, y]: number[]) => `${55 + (x - minX) / spanX * 490},${205 - (y - minY) / spanY * 155}`;
  const route = result.status === 'reachable' ? result : null;

  return (
    <figure className={styles.diagram}>
      <svg viewBox="0 0 600 255" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-description`}>
          Numbered nodes match the key below. Only explicit nodes connect lines; line intersections do not connect.
          {route ? ' The highlighted arrows follow the returned route in travel order.' : ' No traversable route is highlighted.'}
        </desc>
        <defs>
          <marker id={`${id}-direction`} viewBox="0 0 10 10" refX="19" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#58695f" />
          </marker>
          <marker id={`${id}-route`} viewBox="0 0 10 10" refX="18" refY="5" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#215aba" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const assessment = projectedAssessment(context, edge.id, repairId);
          const status = assessment?.blockingBarrierIds.length ? 'blocked' : assessment?.status ?? 'unknown';
          return <polyline key={edge.id} points={edge.geometry.coordinates.map(point).join(' ')}
            fill="none" stroke={status === 'pass' ? '#6e8778' : status === 'blocked' ? '#a74439' : '#8c6a17'}
            strokeWidth="2.5" strokeDasharray={status === 'blocked' ? '8 5' : status === 'unknown' ? '2 5' : undefined}
            markerEnd={!edge.bidirectional ? `url(#${id}-direction)` : undefined} />;
        })}
        {route?.edgeIds.map((edgeId, index) => {
          const edge = edges.find((item) => item.id === edgeId);
          if (!edge) return null;
          const geometry = edge.fromNodeId === route.nodeIds[index]
            ? edge.geometry.coordinates : [...edge.geometry.coordinates].reverse();
          return <polyline key={edgeId} points={geometry.map(point).join(' ')} fill="none" stroke="#215aba"
            strokeWidth="5" markerEnd={`url(#${id}-route)`} />;
        })}
        {nodes.map((node, index) => {
          const [cx, cy] = point(node.coordinate).split(',');
          const active = route?.nodeIds.includes(node.id);
          return <g key={node.id}>
            <title>{`${index + 1}. ${nodeName(context, node.id)}`}</title>
            <circle cx={cx} cy={cy} r="10" fill={active ? '#215aba' : '#fff'} stroke={active ? '#215aba' : '#58695f'} strokeWidth="2" />
            <text x={cx} y={Number(cy) + 3.5} textAnchor="middle" fill={active ? '#fff' : '#172922'} fontSize="11" fontWeight="700">{index + 1}</text>
          </g>;
        })}
      </svg>
      <figcaption>
        <div className={styles.legend} aria-label="Schematic legend">
          <span><i className={styles.legendPass} />Pass</span>
          <span><i className={styles.legendBlocked} />Blocked</span>
          <span><i className={styles.legendUnknown} />Unknown</span>
          <span><i className={styles.legendRoute} />Returned route →</span>
        </div>
        <ol className={styles.nodeKey}>{nodes.map((node) => <li key={node.id}>{nodeName(context, node.id)}</li>)}</ol>
        <p className={styles.small}>Schematic, not to scale. Lines connect only at numbered nodes.</p>
      </figcaption>
    </figure>
  );
}
